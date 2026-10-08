import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "利用規約 - Stint",
};

export default function TermsPage() {
  return (
    <LegalPage title="利用規約" updatedAt="2026年10月8日">
      <p>
        この利用規約は、Stint（以下「本アプリ」）の利用条件を定めるものです。本アプリを利用した時点で、本規約に同意したものとみなします。
      </p>

      <section>
        <h2>1. サービス内容</h2>
        <p>
          本アプリは、作業の開始と終了を記録し、その時間帯をユーザー自身のGoogleカレンダーに予定として登録するサービスです。利用は無料です。
        </p>
      </section>

      <section>
        <h2>2. 免責事項</h2>
        <ul>
          <li>本アプリは個人が開発・運営しており、現状のまま提供されます。動作や記録の正確性、継続的な提供を保証するものではありません。</li>
          <li>通信障害やGoogle側の仕様変更などにより、カレンダーへの登録が失敗したり、記録が失われたりする可能性があります。</li>
          <li>本アプリの利用によって生じた損害について、開発者は責任を負いません。</li>
        </ul>
      </section>

      <section>
        <h2>3. 禁止事項</h2>
        <ul>
          <li>本アプリやそのサーバーに過度な負荷をかける行為</li>
          <li>不正アクセスや、本アプリの運営を妨げる行為</li>
          <li>法令に違反する行為</li>
        </ul>
      </section>

      <section>
        <h2>4. サービスの変更・終了</h2>
        <p>開発者は、事前の通知なく本アプリの内容を変更し、または提供を終了することがあります。</p>
      </section>

      <section>
        <h2>5. 個人情報の取り扱い</h2>
        <p>
          個人情報の取り扱いについては、
          <Link href="/privacy" className="mx-1 underline" style={{ color: "var(--accent)" }}>
            プライバシーポリシー
          </Link>
          をご確認ください。
        </p>
      </section>

      <section>
        <h2>6. 規約の変更</h2>
        <p>本規約は必要に応じて改定することがあります。改定後に本アプリを利用した場合、改定後の規約に同意したものとみなします。</p>
      </section>
    </LegalPage>
  );
}
