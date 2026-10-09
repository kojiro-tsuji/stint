"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, animate, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import type { PresetNode } from "@/types";
import { DEFAULT_COLOR } from "@/lib/colors";

export type SelectedPreset = {
  id: string;
  path: string;
  color: string | null;
};

type FanPickerProps = {
  presets: PresetNode[];
  /** 最終的に1つ選ばれたら呼ぶ。選び直し・階層を戻ったときは null */
  onSelect: (preset: SelectedPreset | null) => void;
};

type FanItem = { kind: "all" | "node"; node: PresetNode };

const CARD_W = 118;
const CARD_H = 168;
/** カード1枚ごとの開き角度（度） */
const STEP_DEG = 9;
/** 扇の要（回転の中心）をカード上端からどれだけ下に置くか */
const PIVOT_PX = 560;
/** 横ドラッグ1pxあたりの回転量（度） */
const DRAG_DEG_PER_PX = 0.14;
const FLY_MS = 320;
/** 吸い付きの強さ（0〜1）。カードが中央に来る位置の付近ほど、指の動きに対して扇が重くなる */
const DETENT_STRENGTH = 0.35;
/** 端を越えて引いたときに伸びる上限の目安（度）。小さいほど重い */
const RUBBER_DEG = 10;
/** 指を払った勢いをどれだけ先まで持ち越すか（秒） */
const FLICK_PROJECTION_S = 0.12;

/** iOSのスクロール端と同じ式。引くほど伸びにくくなる */
function rubberBand(over: number): number {
  const c = 0.55;
  return (1 - 1 / ((Math.abs(over) * c) / RUBBER_DEG + 1)) * RUBBER_DEG * Math.sign(over);
}

/**
 * 指の動き（raw）を扇の回転量に変換する。
 * 範囲内では、カードが中央に来る位置（デテント）付近で動きを鈍らせて吸い付きを出し、
 * 範囲外ではゴムのように伸びにくくする。デテントは phase + STEP_DEG * n の位置にある。
 */
function shapeOffset(raw: number, max: number, phase: number): number {
  if (raw > max) return max + rubberBand(raw - max);
  if (raw < -max) return -max + rubberBand(raw + max);
  const k = (2 * Math.PI) / STEP_DEG;
  return raw - (DETENT_STRENGTH / k) * Math.sin(k * (raw - phase));
}

function nearestDetent(o: number, max: number, phase: number): number {
  const snapped = phase + Math.round((o - phase) / STEP_DEG) * STEP_DEG;
  return Math.max(-max, Math.min(max, snapped));
}

const activeChildren = (nodes: PresetNode[]) => nodes.filter((n) => !n.archived);

/** 自分か、いちばん近い祖先に設定された色。どこにもなければ既定色 */
function resolveColor(chain: PresetNode[]): string {
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].color) return chain[i].color!;
  }
  return DEFAULT_COLOR;
}

/** 色付きカードの文字色。明るい色でも見た目を揃えるため常に白にする */
const CARD_TEXT = "#ffffff";

function vibrate(ms = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(ms);
}

export function FanPicker({ presets, onSelect }: FanPickerProps) {
  const [stack, setStack] = useState<PresetNode[]>([]);
  const [chosen, setChosen] = useState<PresetNode | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const offset = useMotionValue(0);
  const spread = useMotionValue(0);
  const movedRef = useRef(false);
  const panStartRef = useRef(0);
  const lastDetentRef = useRef(0);

  const parent = stack.length ? stack[stack.length - 1] : null;
  const items: FanItem[] = parent
    ? [{ kind: "all", node: parent }, ...activeChildren(parent.children).map((n) => ({ kind: "node" as const, node: n }))]
    : activeChildren(presets).map((n) => ({ kind: "node" as const, node: n }));
  const maxOffset = ((items.length - 1) / 2) * STEP_DEG;
  // 枚数が偶数のときは、カードが中央に来る位置が半ステップずれる
  const detentPhase = (((items.length - 1) / 2) % 1) * STEP_DEG;
  const levelKey = stack.map((n) => n.id).join("/") || "root";

  // 階層が変わる・選び直すたびに、カードを中央から扇状に配り直す
  useEffect(() => {
    if (chosen) return;
    const start = nearestDetent(0, maxOffset, detentPhase);
    offset.set(start);
    lastDetentRef.current = start;
    spread.set(0);
    const controls = animate(spread, 1, { type: "spring", stiffness: 240, damping: 22 });
    return () => controls.stop();
  }, [levelKey, chosen, maxOffset, detentPhase, offset, spread]);

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

  const finish = (chain: PresetNode[]) => {
    const node = chain[chain.length - 1];
    setChosen(node);
    onSelect({ id: node.id, path: chain.map((n) => n.name).join(" / "), color: resolveColor(chain) });
  };

  const choose = (index: number) => {
    if (movedRef.current || leaving !== null) return;
    vibrate();
    const item = items[index];
    if (item.kind === "all") {
      finish(stack);
      return;
    }
    setLeaving(index);
    animate(spread, 0, { duration: 0.25 });
    setTimeout(() => {
      if (activeChildren(item.node.children).length > 0) {
        setStack([...stack, item.node]);
      } else {
        finish([...stack, item.node]);
      }
      setLeaving(null);
    }, FLY_MS);
  };

  const backTo = (depth: number) => {
    vibrate();
    setChosen(null);
    setStack(stack.slice(0, depth));
    onSelect(null);
  };

  const reselect = () => {
    setChosen(null);
    onSelect(null);
  };

  const chosenChain = chosen ? (stack[stack.length - 1]?.id === chosen.id ? stack : [...stack, chosen]) : [];
  const chosenColor = resolveColor(chosenChain);

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* たどってきた階層。タップでその階層の選択に戻る */}
      <div className="flex h-[100px] shrink-0 items-center gap-2.5">
        {stack.length === 0 ? (
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)" }}>
            カードを1枚選んでください。
            <br />
            横にドラッグすると扇が回ります。
          </p>
        ) : (
          stack.map((node, j) => {
            const color = resolveColor(stack.slice(0, j + 1));
            return (
              <motion.button
                key={node.id}
                type="button"
                onClick={() => backTo(j)}
                aria-label={`${node.name} の選択に戻る`}
                initial={{ opacity: 0, y: 48, scale: 1.4 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: j % 2 === 0 ? -4 : 3 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="flex h-[88px] w-[64px] shrink-0 items-start rounded-xl p-2 text-left text-xs font-bold shadow-md"
                style={{ background: color, color: CARD_TEXT }}
              >
                {node.name}
              </motion.button>
            );
          })
        )}
      </div>

      <motion.div
        // pan-y だとブラウザが縦スクロールと判断した時点で pointercancel になりドラッグが途切れる。
        // 画面は1画面に収まる構成なので、扇の領域ではスクロールを完全に止める
        className="relative min-h-[300px] w-full flex-1 select-none"
        style={{ touchAction: "none" }}
        onPointerDown={() => {
          movedRef.current = false;
        }}
        onPanStart={() => {
          if (chosen) return;
          movedRef.current = true;
          offset.stop();
          // 表示中の位置から続けて動かせるよう、吸い付き前の値として扱う
          panStartRef.current = offset.get();
        }}
        onPan={(_, info) => {
          if (chosen) return;
          const raw = panStartRef.current + info.offset.x * DRAG_DEG_PER_PX;
          const shaped = shapeOffset(raw, maxOffset, detentPhase);
          offset.set(shaped);
          // カードが中央を通過するたびに短く振動させ、ダイヤルを回すような手応えを出す
          const detent = nearestDetent(shaped, maxOffset, detentPhase);
          if (detent !== lastDetentRef.current) {
            lastDetentRef.current = detent;
            vibrate(6);
          }
        }}
        onPanEnd={(_, info) => {
          if (chosen) return;
          const velocity = info.velocity.x * DRAG_DEG_PER_PX;
          const target = nearestDetent(offset.get() + velocity * FLICK_PROJECTION_S, maxOffset, detentPhase);
          if (target !== lastDetentRef.current) {
            lastDetentRef.current = target;
            vibrate(6);
          }
          animate(offset, target, { type: "spring", stiffness: 320, damping: 26, velocity });
        }}
      >
        {chosen ? (
          <motion.div
            key={`chosen-${chosen.id}`}
            className="absolute inset-x-0 flex flex-col items-center gap-4"
            style={{ top: "calc(50% - 150px)" }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <div
              className="flex h-[250px] w-[180px] flex-col justify-between rounded-3xl p-[18px] shadow-xl"
              style={{ background: chosenColor, color: CARD_TEXT }}
            >
              <span className="text-xs opacity-80">
                {chosenChain.length > 1 ? chosenChain.slice(0, -1).map((n) => n.name).join(" / ") : "カテゴリ全体"}
              </span>
              <span className="text-[30px] font-black leading-tight">{chosen.name}</span>
              <span className="text-xs font-semibold opacity-90">下のスライダーで開始</span>
            </div>
            <button
              type="button"
              onClick={reselect}
              className="h-10 px-4 text-[13px] underline"
              style={{ color: "var(--muted)" }}
            >
              選び直す
            </button>
          </motion.div>
        ) : (
          items.map((item, i) => (
            <FanCard
              key={`${levelKey}-${item.kind}-${item.node.id}`}
              item={item}
              index={i}
              count={items.length}
              color={item.node.color ?? resolveColor(stack)}
              offset={offset}
              spread={spread}
              leaving={leaving}
              onChoose={() => choose(i)}
            />
          ))
        )}
      </motion.div>
    </div>
  );
}

function FanCard({
  item,
  index,
  count,
  color,
  offset,
  spread,
  leaving,
  onChoose,
}: {
  item: FanItem;
  index: number;
  count: number;
  color: string;
  offset: MotionValue<number>;
  spread: MotionValue<number>;
  leaving: number | null;
  onChoose: () => void;
}) {
  const base = (index - (count - 1) / 2) * STEP_DEG;
  const rotate = useTransform([offset, spread], ([o, s]: number[]) => base * s + o);
  // 中央に近いカードほど手前に重ねる
  const zIndex = useTransform(rotate, (r) => 100 - Math.round(Math.abs(r)));

  const isAll = item.kind === "all";
  const kids = activeChildren(item.node.children).length;
  const name = isAll ? `${item.node.name} 全体` : item.node.name;
  const hint = isAll ? "まとめて記録" : kids > 0 ? `${kids}件 ›` : "これにする";
  const text = isAll ? color : CARD_TEXT;

  const target =
    leaving === null
      ? { opacity: 1, y: 0, scale: 1 }
      : leaving === index
        ? { opacity: 0, y: -320, scale: 0.8 }
        : { opacity: 0, y: 60, scale: 0.9 };

  return (
    <motion.button
      type="button"
      onClick={onChoose}
      aria-label={isAll ? `${item.node.name} 全体として記録する` : kids > 0 ? `${name}（中に${kids}件）` : name}
      initial={{ opacity: 0, y: 90, scale: 0.9 }}
      animate={target}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: leaving === null ? index * 0.035 : 0,
      }}
      className="absolute flex flex-col justify-between rounded-[18px] p-3 text-left shadow-lg active:brightness-110"
      style={{
        // 扇の両端が下がる分を見込んで、中央より少し上に置く
        top: `calc(50% - ${CARD_H / 2 + 30}px)`,
        left: `calc(50% - ${CARD_W / 2}px)`,
        width: CARD_W,
        height: CARD_H,
        rotate,
        zIndex,
        transformOrigin: `50% ${PIVOT_PX}px`,
        background: isAll ? "var(--surface-solid)" : color,
        border: isAll ? `2px dashed ${color}` : "none",
        color: text,
      }}
    >
      <span className="text-[17px] font-extrabold leading-snug">{name}</span>
      <span className="self-end text-[30px] font-black leading-none opacity-20">
        {isAll ? "全" : item.node.name.slice(0, 1)}
      </span>
      <span className="text-[11px] font-semibold opacity-90">{hint}</span>
    </motion.button>
  );
}
