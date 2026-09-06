"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";

type SwipeToConfirmProps = {
  /** "start" = 左→右（開始）, "end" = 右→左（終了） */
  direction: "start" | "end";
  label: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  /** ドラッグ量に応じてトラックに満ちていく強調色 */
  accentColor?: string;
};

const THRESHOLD_RATIO = 0.8; // トラック幅の80%
const HANDLE_SIZE = 60;
const TRACK_PADDING = 6;
const LONG_PRESS_MS = 1000;

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

function ChevronIcon({ pointing }: { pointing: "right" | "left" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: pointing === "left" ? "rotate(180deg)" : undefined }}
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="block h-5 w-5 animate-spin rounded-full border-[2.5px] border-white/30 border-t-white"
    />
  );
}

function IdleHint({ direction }: { direction: "start" | "end" }) {
  const pointing = direction === "start" ? "right" : "left";
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 flex items-center gap-0.5 ${
        direction === "start" ? "left-[70px]" : "right-[70px]"
      }`}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-current opacity-30"
          style={{ color: "var(--muted)" }}
          animate={{ opacity: [0.15, 0.7, 0.15] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        >
          <ChevronIcon pointing={pointing} />
        </motion.span>
      ))}
    </div>
  );
}

export function SwipeToConfirm({
  direction,
  label,
  onConfirm,
  disabled = false,
  accentColor,
}: SwipeToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxX, setMaxX] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const draggingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = accentColor ?? "#6366f1";

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setMaxX(Math.max(0, el.offsetWidth - HANDLE_SIZE - TRACK_PADDING * 2));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!processing) {
      x.set(direction === "start" ? 0 : maxX);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxX, direction]);

  const progress = useTransform(x, (v) => {
    if (maxX === 0) return 0;
    const ratio = direction === "start" ? v / maxX : (maxX - v) / maxX;
    return Math.min(1, Math.max(0, ratio));
  });

  const fillWidth = useTransform(x, (v) =>
    direction === "start" ? v + HANDLE_SIZE : maxX - v + HANDLE_SIZE
  );
  const labelOpacity = useTransform(progress, [0, 0.4], [1, 0]);
  const handleScale = useTransform(progress, [0, 1], [1, 1.06]);
  const glow = useTransform(progress, [0, 1], [0, 0.9]);

  const resetPosition = useCallback(() => {
    animate(x, direction === "start" ? 0 : maxX, { type: "spring", stiffness: 340, damping: 30 });
  }, [x, direction, maxX]);

  const runConfirm = useCallback(async () => {
    if (disabled || processing) return;
    setProcessing(true);
    animate(x, direction === "start" ? maxX : 0, { type: "spring", stiffness: 500, damping: 46 });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(50);
    }
    try {
      await onConfirm();
    } catch {
      resetPosition();
      setProcessing(false);
    }
  }, [disabled, processing, x, direction, maxX, onConfirm, resetPosition]);

  const handleDragEnd = () => {
    draggingRef.current = false;
    setIsDragging(false);
    if (progress.get() >= THRESHOLD_RATIO) {
      runConfirm();
    } else {
      resetPosition();
    }
  };

  const startLongPress = () => {
    if (disabled || processing) return;
    longPressTimer.current = setTimeout(() => {
      if (!draggingRef.current) runConfirm();
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="w-full select-none">
      <motion.div
        ref={trackRef}
        className="surface-card relative flex h-[72px] items-center overflow-hidden rounded-full"
        style={{ padding: TRACK_PADDING }}
      >
        {/* 満ちていくトラック塗り */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full"
          style={{
            width: fillWidth,
            [direction === "start" ? "left" : "right"]: 0,
            background: `linear-gradient(${direction === "start" ? "90deg" : "270deg"}, ${hexToRgba(
              accent,
              0.28
            )}, ${hexToRgba(accent, 0.05)})`,
          }}
        />

        {/* アイドル時のスワイプ誘導ヒント */}
        {!isDragging && !processing && <IdleHint direction={direction} />}

        <motion.p
          style={{ opacity: labelOpacity }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-medium"
        >
          {label}
        </motion.p>

        <motion.div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={processing ? "処理中" : `${label}。スワイプまたは1秒間長押しで確定`}
          aria-disabled={disabled || processing}
          drag={disabled || processing ? false : "x"}
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0.05}
          dragMomentum={false}
          style={{
            x,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            scale: handleScale,
            touchAction: "none",
            background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.75)})`,
            boxShadow: `0 6px 16px -4px ${hexToRgba(accent, 0.55)}`,
          }}
          onDragStart={() => {
            draggingRef.current = true;
            setIsDragging(true);
          }}
          onDragEnd={handleDragEnd}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              runConfirm();
            }
          }}
          className="z-10 flex cursor-grab items-center justify-center rounded-full text-white active:cursor-grabbing"
        >
          <motion.div
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              inset: -6,
              opacity: glow,
              background: `radial-gradient(circle, ${hexToRgba(accent, 0.55)}, transparent 70%)`,
            }}
          />
          <AnimatePresence mode="wait" initial={false}>
            {processing ? (
              <motion.span key="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Spinner />
              </motion.span>
            ) : (
              <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ChevronIcon pointing={direction === "start" ? "right" : "left"} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
