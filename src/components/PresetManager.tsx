"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useToast, ToastViewport } from "@/components/Toast";
import { MAX_DEPTH } from "@/types";
import type { PresetNode } from "@/types";

type PresetsResponse = { presets: PresetNode[] };

const DEFAULT_COLOR = "#9ca3af";

function countDescendants(node: PresetNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

export function PresetManager() {
  const { data, mutate, isLoading } = useSWR<PresetsResponse>("/api/presets", fetcher);
  const { toast, show } = useToast();
  const [creatingRoot, setCreatingRoot] = useState(false);

  const presets = data?.presets ?? [];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ‹ メインへ戻る
        </Link>
        <h1 className="text-base font-bold">プリセット管理</h1>
        <span className="w-16" aria-hidden="true" />
      </header>

      {isLoading ? (
        <p className="text-center text-sm text-gray-400">読み込み中…</p>
      ) : presets.length === 0 && !creatingRoot ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          プリセットがまだありません。下のボタンから追加してください。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {presets.map((node) => (
            <PresetNodeItem key={node.id} node={node} onChange={() => mutate()} onError={(m) => show(m, "error")} />
          ))}
        </ul>
      )}

      {creatingRoot ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setCreatingRoot(true)}
          className="rounded-full border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ＋ 新しいプリセットを追加
        </button>
      )}

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
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
          node.archived ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-200 bg-white"
        }`}
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: node.color ?? DEFAULT_COLOR }}
          aria-hidden="true"
        />
        <span className="flex-1 truncate text-sm text-gray-800">
          {node.name}
          {node.archived && <span className="ml-2 text-xs text-gray-400">（アーカイブ済み）</span>}
        </span>
        <div className="flex shrink-0 items-center gap-1 text-xs">
          {node.depth < MAX_DEPTH && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddingChild((v) => !v)}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 hover:bg-gray-200"
            >
              追加
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 hover:bg-gray-200"
          >
            編集
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={toggleArchived}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 hover:bg-gray-200"
          >
            {node.archived ? "復元" : "隠す"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded-full bg-red-50 px-2.5 py-1 text-red-600 hover:bg-red-100"
          >
            削除
          </button>
        </div>
      </div>

      {editing && (
        <div className="ml-4 mt-1">
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
        <div className="ml-4 mt-1">
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

      {node.children.length > 0 && (
        <ul className="ml-4 mt-2 flex flex-col gap-2 border-l border-gray-200 pl-3">
          {node.children.map((child) => (
            <PresetNodeItem key={child.id} node={child} onChange={onChange} onError={onError} />
          ))}
        </ul>
      )}
    </li>
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-2">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-gray-200"
        aria-label="色"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前（1〜50文字）"
        maxLength={50}
        autoFocus
        className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        保存
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600"
      >
        取消
      </button>
    </form>
  );
}
