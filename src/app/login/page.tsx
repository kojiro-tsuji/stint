import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const HOURS = ["9:00", "10:00", "11:00", "12:00"];
const HOUR_HEIGHT = 48;

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10"
      style={{ paddingTop: "calc(var(--safe-top) + 2.5rem)" }}
    >
      <div className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <span className="text-xl font-bold tracking-tight">Stint</span>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-snug">
          やったことが、
          <br />
          そのまま予定になる。
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          スワイプで開始と終了を記録するだけ。
          <br />
          作業時間はGoogleカレンダーに自動で残ります。
        </p>
      </div>

      <CalendarPreview />

      <div className="mt-10 flex flex-col gap-4">
        <GoogleSignInButton />
        <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
          「Googleで確認されていません」と表示された場合は、
          <br />
          「詳細」→「stintに移動」で続行できます。
        </p>
        <nav className="flex justify-center gap-5 text-xs" style={{ color: "var(--muted)" }}>
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="underline">
            利用規約
          </Link>
        </nav>
      </div>
    </main>
  );
}

/** アプリの使われ方を伝える、1日の予定表の見本（装飾のみ） */
function CalendarPreview() {
  return (
    <div
      aria-hidden="true"
      className="mt-7 grid grid-cols-[44px_minmax(0,1fr)] rounded-[20px] py-4 pr-4 pl-2"
      style={{
        background: "var(--surface-solid)",
        border: "1px solid var(--surface-border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="flex flex-col">
        {HOURS.map((h) => (
          <div
            key={h}
            className="pr-2.5 text-right text-[11px]"
            style={{ height: HOUR_HEIGHT, color: "var(--muted)" }}
          >
            {h}
          </div>
        ))}
      </div>
      <div className="relative">
        {HOURS.map((h, i) => (
          <div
            key={h}
            className="absolute inset-x-0"
            style={{ top: i * HOUR_HEIGHT, borderTop: "1px solid var(--surface-border)" }}
          />
        ))}

        <div
          className="absolute inset-x-0 rounded-lg px-2.5 py-1.5"
          style={{ top: 3, height: 66, background: "var(--event-blue-bg)" }}
        >
          <div className="text-xs font-bold" style={{ color: "var(--event-blue-fg)" }}>
            企画書の作成
          </div>
          <div className="text-[11px]" style={{ color: "var(--event-blue-fg)", opacity: 0.8 }}>
            9:00 – 10:25
          </div>
        </div>

        <div
          className="absolute inset-x-0 flex items-center gap-2 rounded-lg px-2.5"
          style={{ top: HOUR_HEIGHT + 34, height: 30, background: "var(--event-orange-bg)" }}
        >
          <span className="text-xs font-bold" style={{ color: "var(--event-orange-fg)" }}>
            メール返信
          </span>
          <span className="text-[11px]" style={{ color: "var(--event-orange-fg)", opacity: 0.8 }}>
            10:40 – 11:15
          </span>
        </div>

        <div
          className="absolute inset-x-0 rounded-lg px-2.5 py-1.5"
          style={{
            top: HOUR_HEIGHT * 2 + 26,
            height: 66,
            background: "var(--surface-solid)",
            border: "1.5px dashed var(--accent)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">勉強 / 数学</span>
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--live)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--live)" }} />
              計測中
            </span>
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>
            11:25 –
          </div>
        </div>
      </div>
    </div>
  );
}
