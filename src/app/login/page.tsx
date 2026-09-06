import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Stint</h1>
        <p className="text-sm text-gray-500">
          スワイプで、タスクの開始と終了を記録する。
        </p>
      </div>

      <div className="w-full max-w-xs">
        <GoogleSignInButton />
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed text-gray-400">
        ログイン時に「このアプリは Google で確認されていません」という警告画面が表示される場合があります。
        「詳細」を開いて「（アプリ名）に移動」を選択すると続行できます。
      </p>
    </main>
  );
}
