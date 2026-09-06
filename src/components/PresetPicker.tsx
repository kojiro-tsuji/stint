"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
      <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        プリセットがまだありません。
        <br />
        <Link href="/presets" className="mt-2 inline-block font-medium text-blue-600 underline">
          プリセットを作成する
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* パンくず */}
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <button
          type="button"
          onClick={() => setStack([])}
          className={`rounded px-1.5 py-0.5 ${stack.length === 0 ? "font-semibold text-gray-900" : "hover:underline"}`}
        >
          最上位
        </button>
        {stack.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1">
            <span className="text-gray-300">/</span>
            <button
              type="button"
              onClick={() => setStack(stack.slice(0, i + 1))}
              className={`rounded px-1.5 py-0.5 ${i === stack.length - 1 ? "font-semibold text-gray-900" : "hover:underline"}`}
            >
              {node.name}
            </button>
          </span>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {currentLevel.map((node) => {
          const hasChildren = node.children.some((c) => !c.archived);
          const isSelected = selectedId === node.id;
          return (
            <li
              key={node.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => (hasChildren ? setStack([...stack, node]) : onSelect({ id: node.id, path: pathFor(node), color: node.color }))}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: node.color ?? "#9ca3af" }}
                  aria-hidden="true"
                />
                <span className="flex-1 text-sm text-gray-800">{node.name}</span>
                {hasChildren && <span className="text-gray-400">›</span>}
              </button>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => onSelect({ id: node.id, path: pathFor(node), color: node.color })}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ここで決定
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
