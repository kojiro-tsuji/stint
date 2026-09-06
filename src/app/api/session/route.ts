import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { toSessionDTO } from "@/lib/session-dto";

/** 進行中セッションを取得する（復元用）。 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
  }

  const active = await prisma.activeSession.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ session: active ? toSessionDTO(active) : null });
}
