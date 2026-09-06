"use client";

import { useEffect, useState } from "react";

function formatElapsed(sec: number): string {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ElapsedTime({ startedAt, className }: { startedAt: string; className?: string }) {
  // カウンタを加算する方式は使わない（タブ非アクティブ時のスロットリングでズレるため）。
  // 毎秒、実時刻との差分を再計算する。
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedSec = Math.floor((now - new Date(startedAt).getTime()) / 1000);

  return (
    <span className={className} aria-live="polite">
      {formatElapsed(elapsedSec)}
    </span>
  );
}
