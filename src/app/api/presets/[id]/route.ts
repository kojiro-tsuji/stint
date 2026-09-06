import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, handleApiError, ApiException } from "@/lib/api-error";
import { updatePresetSchema } from "@/lib/validations";
import { subtreeRelativeDepths, collectDescendantIds } from "@/lib/preset-tree";
import { MAX_DEPTH } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }

    const existing = await prisma.taskPreset.findUnique({ where: { id } });
    // BR-21: 他ユーザーのリソースは404（403にすると存在が漏れる）
    if (!existing || existing.userId !== session.user.id) {
      return apiErrorResponse("NOT_FOUND", "プリセットが見つかりません");
    }

    const body = await req.json().catch(() => null);
    const parsed = updatePresetSchema.safeParse(body);
    if (!parsed.success) {
      return apiErrorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "入力値が不正です");
    }
    const { name, parentId, color, order, archived } = parsed.data;

    const data: {
      name?: string;
      color?: string | null;
      order?: number;
      archived?: boolean;
      parentId?: string | null;
      depth?: number;
    } = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (order !== undefined) data.order = order;
    if (archived !== undefined) data.archived = archived;

    let descendantDepthUpdates: { id: string; depth: number }[] = [];

    if (parentId !== undefined) {
      // BR-06: 自分自身を親に設定することはできない
      if (parentId === id) {
        throw new ApiException("CIRCULAR_REFERENCE", "自分自身を親にすることはできません");
      }

      const allRows = await prisma.taskPreset.findMany({
        where: { userId: session.user.id },
        select: { id: true, parentId: true, depth: true },
      });

      let newDepth = 0;
      if (parentId !== null) {
        const newParent = allRows.find((r) => r.id === parentId);
        if (!newParent) {
          throw new ApiException("NOT_FOUND", "親プリセットが見つかりません");
        }
        // BR-06: 自分の子孫を親に設定することはできない（循環の防止）
        const descendants = collectDescendantIds(id, allRows);
        if (descendants.has(parentId)) {
          throw new ApiException("CIRCULAR_REFERENCE", "自分の子孫を親にすることはできません");
        }
        newDepth = newParent.depth + 1;
      }

      // BR-05: 子孫を含めた最大深さが MAX_DEPTH 以内に収まることを検証する
      const relativeDepths = subtreeRelativeDepths(id, allRows);
      const maxRelativeDepth = Math.max(...relativeDepths.values());
      if (newDepth + maxRelativeDepth > MAX_DEPTH) {
        throw new ApiException("MAX_DEPTH_EXCEEDED", `階層は最大${MAX_DEPTH + 1}階層までです`);
      }

      data.parentId = parentId;
      data.depth = newDepth;

      descendantDepthUpdates = [...relativeDepths.entries()]
        .filter(([nodeId]) => nodeId !== id)
        .map(([nodeId, rel]) => ({ id: nodeId, depth: newDepth + rel }));
    }

    const [preset] = await prisma.$transaction([
      prisma.taskPreset.update({ where: { id }, data }),
      ...descendantDepthUpdates.map((d) =>
        prisma.taskPreset.update({ where: { id: d.id }, data: { depth: d.depth } })
      ),
    ]);

    return NextResponse.json({ preset });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return apiErrorResponse("UNAUTHORIZED", "ログインが必要です");
    }

    const existing = await prisma.taskPreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return apiErrorResponse("NOT_FOUND", "プリセットが見つかりません");
    }

    // BR-07: 削除時は子孫も連鎖削除される（スキーマの onDelete: Cascade）
    await prisma.taskPreset.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
