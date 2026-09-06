"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { PresetNode } from "@/types";

export type SelectedPreset = {
  id: string;
  path: string;
  color: string | null;
};

type PresetPickerProps = {
  presets: PresetNode[];
  selectedId?: string | null;
  onSelect: (preset: SelectedPreset) => void;
};

export function PresetPicker({ presets, selectedId, onSelect }: PresetPickerProps) {
  const [stack, setStack] = useState<PresetNode[]>([]);

  const currentLevel = useMemo(() => {
    const nodes = stack.length === 0 ? presets : stack[stack.length - 1].children;
    return nodes.filter((n) => !n.archived);
  }, [presets, stack]);

  const pathFor = (node: PresetNode) => [...stack.map((n) => n.name), node.name].join(" / ");

  if (presets.length === 0) {
    return (
      <div className="surface-card rounded-3xl border-dashed p-8 text-center text-sm" style={{ color: "var(--muted)" }}>
        プリセットがまだありません。
        <br />
        <Link href="/settings" className="mt-2 inline-block font-medium" style={{ color: "var(--accent)" }}>
          プリセットを作成する →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
        <button
          type="button"
          onClick={() => setStack([])}
          className="rounded-full px-2.5 py-1 transition-colors"
          style={
            stack.length === 0
              ? { color: "var(--foreground)", background: "var(--surface-border)", fontWeight: 600 }
              : undefined
          }
        >
          最上位
        </button>
        {stack.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1">
            <span className="opacity-40">/</span>
            <button
              type="button"
              onClick={() => setStack(stack.slice(0, i + 1))}
              className="rounded-full px-2.5 py-1 transition-colors"
              style={
                i === stack.length - 1
                  ? { color: "var(--foreground)", background: "var(--surface-border)", fontWeight: 600 }
                  : undefined
              }
            >
              {node.name}
            </button>
          </span>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        <motion.ul
          key={stack.map((n) => n.id).join("/")}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-2"
        >
          {currentLevel.map((node) => {
            const hasChildren = node.children.some((c) => !c.archived);
            const isSelected = selectedId === node.id;
            return (
              <li
                key={node.id}
                className="surface-card flex items-center gap-2 rounded-2xl px-3 py-3 transition-shadow"
                style={
                  isSelected
                    ? {
                        borderColor: hexToRgba(node.color ?? "#6366f1", 0.55),
                        boxShadow: `0 0 0 1.5px ${hexToRgba(node.color ?? "#6366f1", 0.4)}`,
                      }
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    hasChildren
                      ? setStack([...stack, node])
                      : onSelect({ id: node.id, path: pathFor(node), color: node.color })
                  }
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: node.color ?? "#9ca3af" }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[15px]" style={{ color: "var(--foreground)" }}>
                    {node.name}
                  </span>
                  {hasChildren && (
                    <span aria-hidden="true" style={{ color: "var(--muted)" }}>
                      ›
                    </span>
                  )}
                </button>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => onSelect({ id: node.id, path: pathFor(node), color: node.color })}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                    style={
                      isSelected
                        ? { background: "var(--accent)", color: "white" }
                        : { background: "var(--surface-border)", color: "var(--muted)" }
                    }
                  >
                    ここで決定
                  </button>
                )}
              </li>
            );
          })}
        </motion.ul>
      </AnimatePresence>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(99,102,241,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
