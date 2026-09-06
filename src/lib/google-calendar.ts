import { prisma } from "@/lib/prisma";
import { getAccessToken, GoogleAuthError } from "@/lib/google-token";
import type { ActiveSession, User } from "@prisma/client";

export type SyncResult =
  | { ok: true }
  | { ok: false; retriable: boolean; message: string; reauthRequired?: boolean };

async function insertEvent(
  accessToken: string,
  calendarId: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
    calendarId
  )}/events`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * 進行中セッション（endedAt済み）をGoogleカレンダーに登録する。
 * イベントIDにはセッションIDをそのまま使い、冪等性を担保する
 * （同一IDでの再insertはGoogleが409を返すため、二重登録が起きない）。
 */
export async function syncSessionToCalendar(
  session: ActiveSession & { endedAt: Date },
  user: Pick<User, "id" | "calendarId" | "timeZone">
): Promise<SyncResult> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken(user.id);
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return { ok: false, retriable: false, message: "REAUTH_REQUIRED", reauthRequired: true };
    }
    throw err;
  }

  const body = {
    id: session.id,
    summary: session.title,
    start: {
      dateTime: session.startedAt.toISOString(),
      timeZone: user.timeZone,
    },
    end: {
      dateTime: session.endedAt.toISOString(),
      timeZone: user.timeZone,
    },
    description: "スワイプ式タスクトラッカーによる自動記録",
    reminders: { useDefault: false },
  };

  let res = await insertEvent(accessToken, user.calendarId, body);

  if (res.status === 401) {
    // ローカルの有効期限チェックをすり抜けて失効していたケース。強制リフレッシュして1回だけ再試行する。
    await prisma.account.updateMany({
      where: { userId: user.id, provider: "google" },
      data: { access_token: null, expires_at: null },
    });
    try {
      accessToken = await getAccessToken(user.id);
    } catch (err) {
      if (err instanceof GoogleAuthError) {
        return { ok: false, retriable: false, message: "REAUTH_REQUIRED", reauthRequired: true };
      }
      throw err;
    }
    res = await insertEvent(accessToken, user.calendarId, body);
  }

  if (res.ok) {
    return { ok: true };
  }

  if (res.status === 409) {
    // イベントIDの重複 = 既に登録済み。成功として扱う。
    return { ok: true };
  }

  const text = await res.text().catch(() => "");

  if (res.status === 401) {
    return { ok: false, retriable: false, message: "REAUTH_REQUIRED", reauthRequired: true };
  }
  if (res.status === 403 || res.status === 429) {
    return { ok: false, retriable: true, message: `レート制限 (${res.status}): ${text}` };
  }
  if (res.status >= 500) {
    return { ok: false, retriable: true, message: `サーバーエラー (${res.status}): ${text}` };
  }
  // 400等: 実装バグの可能性が高いが、記録は残す
  return { ok: false, retriable: true, message: `リクエストエラー (${res.status}): ${text}` };
}
