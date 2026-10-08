import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError } from "@/lib/api-error";
import { toSessionDTO } from "@/lib/session-dto";
import { finishSession, isOverMaxDuration } from "@/lib/finish-session";
import type { AutoEndedDTO } from "@/types";

/**
 * 進行中セッションを取得する（復元用）。
 * 止め忘れて24時間を超えた計測は、ここで自動的に終了してカレンダーに登録する。
 * アプリを開けば必ずこの処理を通るため、定期実行の仕組みを持たずに済む。
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }
    const userId = session.user.id;

    let active = await prisma.activeSession.findUnique({ where: { userId } });
    let autoEnded: AutoEndedDTO | null = null;

    if (active && isOverMaxDuration(active)) {
      const finished = await finishSession(active);
      if (finished.result !== "discarded") {
        autoEnded = { title: active.title, result: finished.result };
      }
      active = await prisma.activeSession.findUnique({ where: { userId } });
    }

    return NextResponse.json({ session: active ? toSessionDTO(active) : null, autoEnded });
  } catch (err) {
    return handleApiError(err);
  }
}
