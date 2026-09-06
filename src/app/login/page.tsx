import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
        >
          S
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stint</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            スワイプで、タスクの開始と終了を記録する。
          </p>
        </div>
      </div>

      <div className="surface-card w-full max-w-xs rounded-3xl p-6">
        <GoogleSignInButton />
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        ログイン時に「このアプリは Google で確認されていません」という警告画面が表示される場合があります。
        「詳細」を開いて「（アプリ名）に移動」を選択すると続行できます。
      </p>
    </main>
  );
}
