"use client";

import { useEffect, useState } from "react";
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
    <div className="flex w-full flex-col items-center gap-8">
      {isStale && (
        <div className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          まだ計測中です（{STALE_SESSION_HOURS}時間以上経過）
        </div>
      )}

      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: session.color ?? "#9ca3af" }}
          aria-hidden="true"
        />
        <p className="text-lg font-medium text-gray-800">{session.title}</p>
        <ElapsedTime startedAt={session.startedAt} className="font-mono text-5xl font-bold tabular-nums text-gray-900" />
      </div>

      <div className="w-full max-w-sm">
        <SwipeToConfirm direction="end" label="スワイプして終了" onConfirm={onEnd} accentColor="#ef4444" />
      </div>
    </div>
  );
}
