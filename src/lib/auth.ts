import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * @auth/prisma-adapter は Prisma モデル名が `Session` である前提で
 * `p.session.*` を直接呼び出す。本アプリでは概念衝突を避けるため
 * (作業計測の ActiveSession と紛らわしくなる) スキーマ上のモデル名を
 * `AuthSession` にリネームしてあるので、アダプタに渡す前に
 * `session` プロパティを `authSession` へ委譲するプロキシを挟む。
 * 実テーブル名は schema.prisma の @@map("Session") により Auth.js が
 * 期待する形のまま保たれている。
 */
const adapterPrisma = new Proxy(prisma, {
  get(target, prop, receiver) {
    if (prop === "session") {
      return Reflect.get(target, "authSession", target);
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof prisma;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(adapterPrisma),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24, // アクセスがあれば24時間ごとに延長
  },
  providers: [
    Google({
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
          access_type: "offline",
          include_granted_scopes: true,
          // prompt: "consent" は指定しない。理由は設計書セクション6.4を参照。
          // 同意画面は初回の認可時のみ表示され、UXを損なわない。
          // 副作用（2回目以降 refresh_token が返らない）は下の signIn コールバックで対処する。
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "google") return true;

      const existing = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
        },
      });
      if (!existing) return true; // 初回。アダプタに保存を任せる

      await prisma.account.update({
        where: { id: existing.id },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          // 新しい refresh_token が来た場合のみ更新する。
          // 来なければ既存の値を保持する（ここが重要。?? を = にしないこと）
          refresh_token: account.refresh_token ?? existing.refresh_token,
          scope: account.scope,
          id_token: account.id_token,
        },
      });
      return true;
    },
  },
});
