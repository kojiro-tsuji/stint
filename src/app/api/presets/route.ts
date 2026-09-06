import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError, ApiException } from "@/lib/api-error";
import { createPresetSchema } from "@/lib/validations";
import { buildTree } from "@/lib/preset-tree";
import { MAX_DEPTH } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
  }

  const rows = await prisma.taskPreset.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ presets: buildTree(rows) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }

    const body = await req.json().catch(() => null);
    const parsed = createPresetSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "入力値が不正です");
    }
    const { name, parentId, color } = parsed.data;

    let depth = 0;
    if (parentId) {
      const parent = await prisma.taskPreset.findUnique({ where: { id: parentId } });
      // BR-04: 親プリセットは同一ユーザーのものでなければならない
      if (!parent || parent.userId !== session.user.id) {
        throw new ApiException("NOT_FOUND", "親プリセットが見つかりません");
      }
      depth = parent.depth + 1;
      // BR-03: depth が MAX_DEPTH を超えるプリセットは作成できない
      if (depth > MAX_DEPTH) {
        throw new ApiException("MAX_DEPTH_EXCEEDED", `階層は最大${MAX_DEPTH + 1}階層までです`);
      }
    }

    const maxOrder = await prisma.taskPreset.aggregate({
      where: { userId: session.user.id, parentId: parentId ?? null },
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    const preset = await prisma.taskPreset.create({
      data: {
        userId: session.user.id,
        name,
        parentId: parentId ?? null,
        depth,
        color: color ?? null,
        order,
      },
    });

    return NextResponse.json(
      {
        preset: {
          id: preset.id,
          name: preset.name,
          parentId: preset.parentId,
          depth: preset.depth,
          color: preset.color,
          order: preset.order,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
