import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError } from "@/lib/api-error";
import { syncSessionToCalendar } from "@/lib/google-calendar";
import { MIN_DURATION_SEC } from "@/types";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }
    const userId = session.user.id;

    let active = await prisma.activeSession.findUnique({ where: { userId } });
    if (!active) {
      return apiErrorResponse("NOT_FOUND", "進行中のセッションが見つかりません");
    }

    // 手順2: まず終了時刻をDBに記録する。これより後でカレンダー登録を試みる。
    // この順序を崩すと、通信断のときに作業時間そのものが失われる。
    if (!active.endedAt) {
      active = await prisma.activeSession.update({
        where: { userId },
        data: { endedAt: new Date() },
      });
    }

    const endedAt = active.endedAt!;
    const durationSec = Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000);

    if (durationSec < MIN_DURATION_SEC) {
      // BR-13: 誤操作対策。短すぎるセッションはカレンダーに登録せず破棄する
      await prisma.activeSession.delete({ where: { userId } });
      return NextResponse.json({ result: "discarded", durationSec });
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, calendarId: true, timeZone: true },
    });

    const result = await syncSessionToCalendar(
      { ...active, endedAt },
      user
    );

    if (result.ok) {
      await prisma.activeSession.delete({ where: { userId } });
      return NextResponse.json({ result: "synced", durationSec });
    }

    await prisma.activeSession.update({
      where: { userId },
      data: {
        syncAttempts: { increment: 1 },
        syncError: result.message,
      },
    });

    if (result.reauthRequired) {
      return apiErrorResponse("REAUTH_REQUIRED", "Googleへの再ログインが必要です。作業時間は保存されています。");
    }

    return NextResponse.json({ result: "sync_failed", message: result.message });
  } catch (err) {
    return handleApiError(err);
  }
}
