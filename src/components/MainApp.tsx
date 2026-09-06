"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, signIn, useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PresetPicker, type SelectedPreset } from "@/components/PresetPicker";
import { ActiveSessionView } from "@/components/ActiveSessionView";
import { SwipeToConfirm } from "@/components/SwipeToConfirm";
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

  // タブが再表示された時にサーバー側の状態と突き合わせる（別端末で終了された場合の取り残し防止）
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
      throw err; // SwipeToConfirm 側でハンドルを元に戻す
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
        // サーバーに終了が記録されなかった（通信断など）。ハンドルを戻して再試行できるようにする。
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
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-base font-bold tracking-tight">Stint</span>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/presets" className="text-gray-500 hover:underline">
            プリセット管理
          </Link>
          {userSession?.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userSession.user.image} alt="" className="h-7 w-7 rounded-full" />
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 hover:underline"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        {sessionLoading ? (
          <p className="text-sm text-gray-400">読み込み中…</p>
        ) : needsReauth ? (
          <ReauthModal onReauth={() => signIn("google", { callbackUrl: "/" })} />
        ) : current && !current.endedAt ? (
          <ActiveSessionView session={current} onEnd={handleEnd} />
        ) : current && current.endedAt ? (
          <SyncPendingView
            session={current}
            retrying={retrying}
            onRetry={handleRetry}
          />
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">これから行うタスクを選んでください</p>
              {selected && (
                <p className="mt-1 text-base font-medium text-gray-900">{selected.path}</p>
              )}
            </div>

            {presetsLoading ? (
              <p className="text-center text-sm text-gray-400">読み込み中…</p>
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
          </div>
        )}
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
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        カレンダーへの登録に失敗しています。作業時間は保存されているので、記録が消えることはありません。
      </div>
      <p className="font-medium text-gray-800">{session.title}</p>
      {session.syncError && <p className="text-xs text-gray-500">詳細: {session.syncError}</p>}
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="w-full rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {retrying ? "再送中…" : "もう一度カレンダーに登録する"}
      </button>
    </div>
  );
}

function ReauthModal({ onReauth }: { onReauth: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-base font-semibold text-gray-900">Googleへの再ログインが必要です</p>
        <p className="text-sm text-gray-500">
          作業時間は保存されています。再ログインするとカレンダーへの登録を再開できます。
        </p>
        <button
          type="button"
          onClick={onReauth}
          className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
        >
          Googleに再ログイン
        </button>
      </div>
    </div>
  );
}
