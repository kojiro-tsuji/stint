import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { AuthFooter } from "@/components/AuthFooter";

export const metadata: Metadata = {
  title: "ログイン - Stint",
};

/** 登録済みユーザー向けのログイン画面。新規向けの紹介は /login に置いている */
export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10"
      style={{ paddingTop: "calc(var(--safe-top) + 2.5rem)" }}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <BrandMark size={56} />
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-bold leading-snug">おかえりなさい</h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            登録済みのGoogleアカウントで
            <br />
            ログインしてください。
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <GoogleSignInButton label="Googleでログイン" selectAccount />
        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          はじめての方は{" "}
          <Link href="/login" className="font-medium underline" style={{ color: "var(--accent)" }}>
            こちら
          </Link>
        </p>
        <AuthFooter />
      </div>
    </main>
  );
}
