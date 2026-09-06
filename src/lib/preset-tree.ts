import type { TaskPreset } from "@prisma/client";
import type { PresetNode } from "@/types";

/**
 * フラットな行配列からツリー構造を組み立てる。
 * プリセットは1ユーザーあたり多くても数十件のため、全件を1クエリで取得し
 * メモリ上でツリー化する（再帰CTEは使わない）。
 */
export function buildTree(rows: TaskPreset[]): PresetNode[] {
  const map = new Map<string, PresetNode>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.name,
      depth: r.depth,
      color: r.color,
      order: r.order,
      archived: r.archived,
      children: [],
    });
  }

  const roots: PresetNode[] = [];
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parentId) {
      const parent = map.get(r.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 親が(同一クエリ結果内に)見つからない場合はルート扱いにする防御
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  const sortRec = (nodes: PresetNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return roots;
}

/** 指定ノードから祖先を辿ってフルパス文字列を組み立てる（例: "勉強 / 数学"） */
export function buildFullPath(
  preset: { id: string; name: string; parentId: string | null },
  byId: Map<string, { id: string; name: string; parentId: string | null }>
): string {
  const parts: string[] = [preset.name];
  let current = preset;
  const seen = new Set([current.id]);
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break; // 循環防御
    parts.unshift(parent.name);
    seen.add(parent.id);
    current = parent;
  }
  return parts.join(" / ");
}

/** node（自分自身を含む）配下の子孫すべてのIDを集める */
export function collectDescendantIds(rootId: string, rows: { id: string; parentId: string | null }[]): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    if (!childrenOf.has(r.parentId)) childrenOf.set(r.parentId, []);
    childrenOf.get(r.parentId)!.push(r.id);
  }
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const childId of childrenOf.get(id) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }
  return result;
}

/** rootId を根とした部分木の各ノードの相対深さ（rootId自身は0）を返す */
export function subtreeRelativeDepths(
  rootId: string,
  rows: { id: string; parentId: string | null }[]
): Map<string, number> {
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    if (!childrenOf.has(r.parentId)) childrenOf.set(r.parentId, []);
    childrenOf.get(r.parentId)!.push(r.id);
  }
  const result = new Map<string, number>();
  const walk = (id: string, depth: number) => {
    result.set(id, depth);
    for (const childId of childrenOf.get(id) ?? []) {
      walk(childId, depth + 1);
    }
  };
  walk(rootId, 0);
  return result;
}
