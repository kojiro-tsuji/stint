import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError, ApiException } from "@/lib/api-error";
import { startSessionSchema } from "@/lib/validations";
import { buildFullPath } from "@/lib/preset-tree";
import { generateEventId } from "@/lib/event-id";
import { toSessionDTO } from "@/lib/session-dto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }
    const userId = session.user.id;

    const body = await req.json().catch(() => null);
    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "入力値が不正です");
    }
    const { presetId } = parsed.data;

    // 自ユーザーの全プリセットを取得（フルパス組み立てのため）
    const allPresets = await prisma.taskPreset.findMany({ where: { userId } });
    const preset = allPresets.find((p) => p.id === presetId);
    if (!preset) {
      throw new ApiException("NOT_FOUND", "プリセットが見つかりません");
    }

    const byId = new Map(allPresets.map((p) => [p.id, p]));
    const title = buildFullPath(preset, byId);
    const id = generateEventId();

    try {
      const created = await prisma.activeSession.create({
        data: {
          id,
          userId,
          presetId: preset.id,
          title,
          color: preset.color,
        },
      });
      return NextResponse.json({ session: toSessionDTO(created) }, { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // BR-10: userId が @unique のため、既に進行中セッションがあると一意制約違反になる
        const existing = await prisma.activeSession.findUnique({ where: { userId } });
        if (existing?.endedAt) {
          // BR-16: 同期未解決のセッションが残っている場合、先にそれを解決させる
          return NextResponse.json(
            { error: "SYNC_PENDING", message: "未同期のセッションが残っています。先に同期を解決してください。" },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error: "SESSION_ALREADY_ACTIVE",
            message: "既に進行中のセッションがあります。",
            session: existing ? toSessionDTO(existing) : null,
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
