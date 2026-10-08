import type { ActiveSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncSessionToCalendar } from "@/lib/google-calendar";
import { MAX_SESSION_HOURS, MIN_DURATION_SEC } from "@/types";

const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;

export type FinishResult =
  | { result: "discarded"; durationSec: number }
  | { result: "synced"; durationSec: number }
  | { result: "sync_failed"; message: string }
  | { result: "reauth_required" };

/** 24時間を超えて計測が続いているか（終了時刻が未記録のものだけが対象） */
export function isOverMaxDuration(session: ActiveSession, now = new Date()): boolean {
  return !session.endedAt && now.getTime() - session.startedAt.getTime() >= MAX_SESSION_MS;
}

/**
 * 計測を終了し、カレンダーに登録する。手動の終了と24時間での自動終了で共通の処理。
 * 終了時刻は開始から最大24時間で打ち切る（止め忘れても、それ以上の予定にはしない）。
 */
export async function finishSession(active: ActiveSession, now = new Date()): Promise<FinishResult> {
  const { userId } = active;

  // まず終了時刻をDBに記録する。これより後でカレンダー登録を試みる。
  // この順序を崩すと、通信断のときに作業時間そのものが失われる。
  // 同時に2つのリクエストが来ても、先に書いた方の終了時刻が残るよう endedAt: null を条件にする。
  if (!active.endedAt) {
    const endedAt = new Date(Math.min(now.getTime(), active.startedAt.getTime() + MAX_SESSION_MS));
    await prisma.activeSession.updateMany({ where: { id: active.id, endedAt: null }, data: { endedAt } });
  }
  const current = await prisma.activeSession.findUnique({ where: { id: active.id } });
  if (!current?.endedAt) {
    // 別のリクエストがすでに登録まで済ませて削除した
    return { result: "synced", durationSec: 0 };
  }

  const endedAt = current.endedAt;
  const durationSec = Math.floor((endedAt.getTime() - current.startedAt.getTime()) / 1000);

  if (durationSec < MIN_DURATION_SEC) {
    // BR-13: 誤操作対策。短すぎるセッションはカレンダーに登録せず破棄する
    await prisma.activeSession.deleteMany({ where: { id: current.id } });
    return { result: "discarded", durationSec };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, calendarId: true, timeZone: true },
  });

  const result = await syncSessionToCalendar({ ...current, endedAt }, user);

  if (result.ok) {
    await prisma.activeSession.deleteMany({ where: { id: current.id } });
    return { result: "synced", durationSec };
  }

  await prisma.activeSession.updateMany({
    where: { id: current.id },
    data: { syncAttempts: { increment: 1 }, syncError: result.message },
  });

  return result.reauthRequired ? { result: "reauth_required" } : { result: "sync_failed", message: result.message };
}
