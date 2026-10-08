import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/** プライバシーポリシー・利用規約など、ログイン不要で公開する静的文書の共通レイアウト */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main
      className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16"
      style={{ paddingTop: "calc(var(--safe-top) + 2.5rem)" }}
    >
      <Link href="/" className="flex w-fit items-center gap-2.5">
        <BrandMark size={28} />
        <span className="text-lg font-bold tracking-tight">Stint</span>
      </Link>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        最終更新日: {updatedAt}
      </p>
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </main>
  );
}
