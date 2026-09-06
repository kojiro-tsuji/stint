import { prisma } from "@/lib/prisma";

export class GoogleAuthError extends Error {
  constructor(message = "REAUTH_REQUIRED") {
    super(message);
    this.name = "GoogleAuthError";
  }
}

/**
 * Googleへのリクエストに使うアクセストークンを返す。
 * 有効期限が切れていれば（60秒の余裕を見て）リフレッシュする。
 * この処理はサーバー側で完結し、ユーザーには一切見えない。
 */
export async function getAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.refresh_token) {
    throw new GoogleAuthError();
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.access_token && account.expires_at && account.expires_at > now + 60) {
    return account.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!res.ok) {
    // リフレッシュトークンが失効（ユーザーによる連携解除、6ヶ月未使用など）
    throw new GoogleAuthError();
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: data.access_token,
      expires_at: now + data.expires_in,
    },
  });
  return data.access_token;
}
