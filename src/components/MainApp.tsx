"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PresetPicker, type SelectedPreset } from "@/components/PresetPicker";
import { ActiveSessionView } from "@/components/ActiveSessionView";
import { SwipeToConfirm } from "@/components/SwipeToConfirm";
import { UserMenu } from "@/components/UserMenu";
import { useToast, ToastViewport } from "@/components/Toast";
import type { ActiveSessionDTO, PresetNode } from "@/types";

type SessionResponse = { session: ActiveSessionDTO | null };
type PresetsResponse = { presets: PresetNode[] };

export function MainApp() {
  const { data: userSession } = useSession();
  const { toast, show } = useToast();
  const [selected, setSelected] = useState<SelectedPreset | null>(null);
  const [retrying, setRetrying] = useState(false);

  const {
    data: sessionData,
    mutate: mutateSession,
    isLoading: sessionLoading,
  } = useSWR<SessionResponse>("/api/session", fetcher);
  const { data: presetsData, isLoading: presetsLoading } = useSWR<PresetsResponse>(
    "/api/presets",
    fetcher
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        mutateSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mutateSession]);

  const current = sessionData?.session ?? null;
  const needsReauth = current?.syncError === "REAUTH_REQUIRED";

  const handleStart = async () => {
    if (!selected) return;
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: selected.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        show(body?.message ?? "開始できませんでした。もう一度お試しください。", "error");
        await mutateSession();
        throw new Error(body?.error ?? "start_failed");
      }
      show("計測を開始しました", "success");
      setSelected(null);
      await mutateSession();
    } catch (err) {
      await mutateSession();
      throw err;
    }
  };

  const handleEnd = async () => {
    const startedId = current?.id;
    try {
      const res = await fetch("/api/session/end", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 403) {
        show(body?.message ?? "Googleへの再ログインが必要です。作業時間は保存されています。", "error");
      } else if (!res.ok) {
        show(body?.message ?? "終了処理に失敗しました。もう一度お試しください。", "error");
      } else if (body.result === "synced") {
        show("カレンダーに登録しました", "success");
      } else if (body.result === "discarded") {
        show("60秒未満だったため記録は破棄されました", "info");
      } else if (body.result === "sync_failed") {
        show("作業時間は保存されています。カレンダーへの登録のみ失敗しました。", "error");
      }
    } catch {
      show("通信エラーが発生しました。作業時間は失われません。もう一度お試しください。", "error");
    } finally {
      const updated = await mutateSession();
      const stillActiveSameSession =
        updated?.session && !updated.session.endedAt && updated.session.id === startedId;
      if (stillActiveSameSession) {
        throw new Error("not_recorded");
      }
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/session/retry", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 403) {
        show(body?.message ?? "Googleへの再ログインが必要です。", "error");
      } else if (!res.ok) {
        show(body?.message ?? "再送に失敗しました", "error");
      } else if (body.result === "synced") {
        show("カレンダーに登録しました", "success");
      } else {
        show(body?.message ?? "再送に失敗しました。時間をおいて再度お試しください。", "error");
      }
    } catch {
      show("通信エラーが発生しました", "error");
    } finally {
      await mutateSession();
      setRetrying(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
          >
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Stint</span>
        </Link>
        <UserMenu user={userSession?.user} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-8">
        <AnimatePresence mode="wait">
          {sessionLoading ? (
            <motion.p key="loading" exit={{ opacity: 0 }} className="text-sm" style={{ color: "var(--muted)" }}>
              読み込み中…
            </motion.p>
          ) : needsReauth ? (
            <ReauthModal key="reauth" onReauth={() => signIn("google", { callbackUrl: "/" })} />
          ) : current && !current.endedAt ? (
            <ActiveSessionView key="active" session={current} onEnd={handleEnd} />
          ) : current && current.endedAt ? (
            <SyncPendingView key="pending" session={current} retrying={retrying} onRetry={handleRetry} />
          ) : (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="flex w-full max-w-sm flex-col gap-6"
            >
              <div className="text-center">
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  これから行うタスクを選んでください
                </p>
                {selected && (
                  <p className="mt-1 text-lg font-semibold tracking-tight">{selected.path}</p>
                )}
              </div>

              {presetsLoading ? (
                <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
                  読み込み中…
                </p>
              ) : (
                <PresetPicker
                  presets={presetsData?.presets ?? []}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              )}

              <SwipeToConfirm
                direction="start"
                label={selected ? "スワイプして開始" : "先にタスクを選択してください"}
                onConfirm={handleStart}
                disabled={!selected}
                accentColor={selected?.color ?? "#22c55e"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ToastViewport toast={toast} />
    </div>
  );
}

function SyncPendingView({
  session,
  retrying,
  onRetry,
}: {
  session: ActiveSessionDTO;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex w-full max-w-sm flex-col items-center gap-4 text-center"
    >
      <div
        className="w-full rounded-2xl border px-4 py-3 text-sm"
        style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#b91c1c" }}
      >
        カレンダーへの登録に失敗しています。作業時間は保存されているので、記録が消えることはありません。
      </div>
      <div className="surface-card w-full rounded-3xl px-6 py-6">
        <p className="font-medium">{session.title}</p>
        {session.syncError && (
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            詳細: {session.syncError}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="w-full rounded-full px-6 py-3.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
      >
        {retrying ? "再送中…" : "もう一度カレンダーに登録する"}
      </button>
    </motion.div>
  );
}

function ReauthModal({ onReauth }: { onReauth: () => void }) {
  return (
    <motion.div
      key="reauth-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-7 text-center"
      >
        <p className="text-base font-semibold">Googleへの再ログインが必要です</p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          作業時間は保存されています。再ログインするとカレンダーへの登録を再開できます。
        </p>
        <button
          type="button"
          onClick={onReauth}
          className="w-full rounded-full px-6 py-3.5 text-sm font-medium text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
        >
          Googleに再ログイン
        </button>
      </motion.div>
    </motion.div>
  );
}
