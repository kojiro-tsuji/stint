"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ElapsedTime } from "@/components/ElapsedTime";
import { SwipeToConfirm } from "@/components/SwipeToConfirm";
import { STALE_SESSION_HOURS } from "@/types";
import type { ActiveSessionDTO } from "@/types";

export function ActiveSessionView({
  session,
  onEnd,
}: {
  session: ActiveSessionDTO;
  onEnd: () => Promise<void>;
}) {
  const [isStale, setIsStale] = useState(false);
  const accent = session.color ?? "#ef4444";

  useEffect(() => {
    const check = () => {
      const hours = (Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60 * 60);
      setIsStale(hours >= STALE_SESSION_HOURS);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [session.startedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex w-full max-w-sm flex-col items-center gap-8"
    >
      {isStale && (
        <div
          className="w-full rounded-2xl border px-4 py-2.5 text-center text-sm"
          style={{
            borderColor: "rgba(245,158,11,0.35)",
            background: "rgba(245,158,11,0.1)",
            color: "#b45309",
          }}
        >
          まだ計測中です（{STALE_SESSION_HOURS}時間以上経過）
        </div>
      )}

      <div className="surface-card flex w-full flex-col items-center gap-5 rounded-[32px] px-8 py-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: accent }}
            />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            計測中
          </span>
        </div>

        <p className="px-4 text-center text-lg font-medium" style={{ color: "var(--foreground)" }}>
          {session.title}
        </p>

        <ElapsedTime
          startedAt={session.startedAt}
          className="font-mono text-6xl font-bold tabular-nums tracking-tight"
        />
      </div>

      <div className="w-full">
        <SwipeToConfirm direction="end" label="スワイプして終了" onConfirm={onEnd} accentColor={accent} />
      </div>
    </motion.div>
  );
}
