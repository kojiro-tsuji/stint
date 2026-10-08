import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError } from "@/lib/api-error";
import { finishSession } from "@/lib/finish-session";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }
    const userId = session.user.id;

    const active = await prisma.activeSession.findUnique({ where: { userId } });
    if (!active) {
      return apiErrorResponse("NOT_FOUND", "進行中のセッションが見つかりません");
    }

    const finished = await finishSession(active);

    if (finished.result === "reauth_required") {
      return apiErrorResponse("REAUTH_REQUIRED", "Googleへの再ログインが必要です。作業時間は保存されています。");
    }
    return NextResponse.json(finished);
  } catch (err) {
    return handleApiError(err);
  }
}
