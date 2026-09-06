"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useToast, ToastViewport } from "@/components/Toast";
import { MAX_DEPTH } from "@/types";
import type { PresetNode } from "@/types";

type PresetsResponse = { presets: PresetNode[] };

const DEFAULT_COLOR = "#6366f1";
const SWATCHES = ["#6366f1", "#ec4899", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#0ea5e9", "#8b5cf6"];

function countDescendants(node: PresetNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

export function PresetManager() {
  const { data, mutate, isLoading } = useSWR<PresetsResponse>("/api/presets", fetcher);
  const { toast, show } = useToast();
  const [creatingRoot, setCreatingRoot] = useState(false);

  const presets = data?.presets ?? [];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3" style={{ paddingTop: "calc(var(--safe-top) + 0.5rem)" }}>
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ background: "var(--surface-border)" }}
          aria-label="メインへ戻る"
        >
          ‹
        </Link>
        <h1 className="text-xl font-bold tracking-tight">設定</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          タスクプリセット
        </h2>
        <p className="px-1 text-xs" style={{ color: "var(--muted)" }}>
          スワイプ開始時に選ぶタスクの種類を、最大3階層まで作成できます。
        </p>

        {isLoading ? (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            読み込み中…
          </p>
        ) : presets.length === 0 && !creatingRoot ? (
          <div className="surface-card rounded-3xl border-dashed p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            プリセットがまだありません。下のボタンから追加してください。
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {presets.map((node) => (
              <PresetNodeItem key={node.id} node={node} onChange={() => mutate()} onError={(m) => show(m, "error")} />
            ))}
          </ul>
        )}

        <AnimatePresence initial={false}>
          {creatingRoot && (
            <PresetForm
              mode="create"
              parentId={null}
              onCancel={() => setCreatingRoot(false)}
              onDone={async () => {
                setCreatingRoot(false);
                await mutate();
              }}
              onError={(m) => show(m, "error")}
            />
          )}
        </AnimatePresence>

        {!creatingRoot && (
          <button
            type="button"
            onClick={() => setCreatingRoot(true)}
            className="rounded-2xl border border-dashed px-4 py-3 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--surface-border)", color: "var(--accent)" }}
          >
            ＋ 新しいプリセットを追加
          </button>
        )}
      </section>

      <ToastViewport toast={toast} />
    </div>
  );
}

function PresetNodeItem({
  node,
  onChange,
  onError,
}: {
  node: PresetNode;
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingChild, setAddingChild] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleArchived = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/presets/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !node.archived }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? "更新に失敗しました");
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const count = countDescendants(node);
    const confirmMessage =
      count > 0
        ? `「${node.name}」を削除します。配下の${count}件も削除されます。よろしいですか？`
        : `「${node.name}」を削除します。よろしいですか？`;
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/presets/${node.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? "削除に失敗しました");
      }
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <div className={`surface-card flex items-center gap-2 rounded-2xl px-3 py-3 ${node.archived ? "opacity-50" : ""}`}>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: node.color ?? DEFAULT_COLOR }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {node.name}
          {node.archived && (
            <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
              （アーカイブ済み）
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1 text-xs">
          {node.depth < MAX_DEPTH && (
            <IconButton label="追加" disabled={busy} onClick={() => setAddingChild((v) => !v)} />
          )}
          <IconButton label="編集" disabled={busy} onClick={() => setEditing((v) => !v)} />
          <IconButton label={node.archived ? "復元" : "隠す"} disabled={busy} onClick={toggleArchived} />
          <IconButton label="削除" tone="danger" disabled={busy} onClick={handleDelete} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <div className="ml-4 mt-1.5">
            <PresetForm
              mode="edit"
              presetId={node.id}
              initialName={node.name}
              initialColor={node.color}
              onCancel={() => setEditing(false)}
              onDone={async () => {
                setEditing(false);
                onChange();
              }}
              onError={onError}
            />
          </div>
        )}

        {addingChild && (
          <div className="ml-4 mt-1.5">
            <PresetForm
              mode="create"
              parentId={node.id}
              onCancel={() => setAddingChild(false)}
              onDone={async () => {
                setAddingChild(false);
                onChange();
              }}
              onError={onError}
            />
          </div>
        )}
      </AnimatePresence>

      {node.children.length > 0 && (
        <ul className="ml-3.5 mt-2 flex flex-col gap-2 border-l pl-3" style={{ borderColor: "var(--surface-border)" }}>
          {node.children.map((child) => (
            <PresetNodeItem key={child.id} node={child} onChange={onChange} onError={onError} />
          ))}
        </ul>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full px-2.5 py-1.5 transition-colors disabled:opacity-40"
      style={
        tone === "danger"
          ? { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
          : { background: "var(--surface-border)", color: "var(--muted)" }
      }
    >
      {label}
    </button>
  );
}

function PresetForm({
  mode,
  parentId,
  presetId,
  initialName = "",
  initialColor,
  onCancel,
  onDone,
  onError,
}: {
  mode: "create" | "edit";
  parentId?: string | null;
  presetId?: string;
  initialName?: string;
  initialColor?: string | null;
  onCancel: () => void;
  onDone: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? DEFAULT_COLOR);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError("名前を入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/presets" : `/api/presets/${presetId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const payload =
        mode === "create" ? { name, parentId: parentId ?? undefined, color } : { name, color };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message ?? "保存に失敗しました");
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="surface-card flex flex-col gap-3 rounded-2xl p-3"
      style={{ borderColor: hexAlpha(color, 0.4) }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前（1〜50文字）"
        maxLength={50}
        autoFocus
        className="rounded-xl border-0 px-3 py-2 text-sm outline-none ring-1 focus:ring-2"
        style={{ background: "var(--surface-border)", color: "var(--foreground)" }}
      />
      <div className="flex items-center gap-1.5">
        {SWATCHES.map((sw) => (
          <button
            key={sw}
            type="button"
            onClick={() => setColor(sw)}
            aria-label={sw}
            className="h-6 w-6 shrink-0 rounded-full transition-transform"
            style={{
              backgroundColor: sw,
              transform: color.toLowerCase() === sw.toLowerCase() ? "scale(1.15)" : undefined,
              boxShadow: color.toLowerCase() === sw.toLowerCase() ? `0 0 0 2px var(--surface-solid), 0 0 0 3.5px ${sw}` : undefined,
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
          aria-label="カスタム色"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3.5 py-1.5 text-xs"
          style={{ background: "var(--surface-border)", color: "var(--muted)" }}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
        >
          保存
        </button>
      </div>
    </motion.form>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(99,102,241,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
