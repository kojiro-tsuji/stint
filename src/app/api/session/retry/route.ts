import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError } from "@/lib/api-error";
import { syncSessionToCalendar } from "@/lib/google-calendar";

/** 同期に失敗したセッション（endedAt が入っている行）を再送する。 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }
    const userId = session.user.id;

    const active = await prisma.activeSession.findUnique({ where: { userId } });
    if (!active || !active.endedAt) {
      return apiErrorResponse("NOT_FOUND", "再送待ちのセッションがありません");
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, calendarId: true, timeZone: true },
    });

    const result = await syncSessionToCalendar({ ...active, endedAt: active.endedAt }, user);

    if (result.ok) {
      await prisma.activeSession.delete({ where: { userId } });
      return NextResponse.json({ result: "synced" });
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
