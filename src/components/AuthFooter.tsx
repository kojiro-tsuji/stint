import Link from "next/link";

/** /login と /signin で共通の、未確認アプリ警告の案内と規約リンク */
export function AuthFooter() {
  return (
    <>
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
    </>
  );
}
