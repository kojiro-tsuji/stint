"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

type SwipeToConfirmProps = {
  /** "start" = 左→右（開始）, "end" = 右→左（終了） */
  direction: "start" | "end";
  label: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  /** ドラッグ量に応じて背景に薄く重ねる強調色 */
  accentColor?: string;
};

const THRESHOLD_RATIO = 0.8; // トラック幅の80%
const HANDLE_SIZE = 52;
const LONG_PRESS_MS = 1000;

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(34,197,94,${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
    />
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
  const x = useMotionValue(0);
  const draggingRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // トラック幅の計測。リサイズにも追従する。
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setMaxX(Math.max(0, el.offsetWidth - HANDLE_SIZE - 8));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 初期位置：開始は左端、終了は右端
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

  const background = useTransform(
    progress,
    [0, 1],
    ["rgba(17,24,39,0.05)", hexToRgba(accentColor ?? "#22c55e", 0.22)]
  );

  const resetPosition = useCallback(() => {
    animate(x, direction === "start" ? 0 : maxX, { type: "spring", stiffness: 320, damping: 32 });
  }, [x, direction, maxX]);

  const runConfirm = useCallback(async () => {
    if (disabled || processing) return;
    setProcessing(true);
    animate(x, direction === "start" ? maxX : 0, { type: "spring", stiffness: 420, damping: 42 });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(50);
    }
    try {
      await onConfirm();
      // 成功後は通常、親側で画面が切り替わる。念のため状態は残す（unmountされる想定）。
    } catch {
      resetPosition();
      setProcessing(false);
    }
  }, [disabled, processing, x, direction, maxX, onConfirm, resetPosition]);

  const handleDragEnd = () => {
    draggingRef.current = false;
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

  const arrow = direction === "start" ? "›››" : "‹‹‹";

  return (
    <div className="w-full select-none">
      <motion.div
        ref={trackRef}
        style={{ background }}
        className="relative flex h-16 items-center overflow-hidden rounded-full border border-gray-200 px-1"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">
          {processing ? "処理中…" : label}
        </div>
        <motion.div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={processing ? "処理中" : `${label}。スワイプまたは1秒間長押しで確定`}
          aria-disabled={disabled || processing}
          drag={disabled || processing ? false : "x"}
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0.06}
          dragMomentum={false}
          style={{ x, width: HANDLE_SIZE, height: HANDLE_SIZE - 8 }}
          onDragStart={() => {
            draggingRef.current = true;
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
          className="z-10 flex cursor-grab items-center justify-center rounded-full bg-white text-gray-600 shadow-md active:cursor-grabbing"
        >
          {processing ? <Spinner /> : <span aria-hidden="true">{arrow}</span>}
        </motion.div>
      </motion.div>
    </div>
  );
}
