import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "プライバシーポリシー - Stint",
};

const CONTACT_EMAIL = "kojirot5810@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt="2026年10月8日">
      <p>
        Stint（以下「本アプリ」）は、個人が開発・運営するタスク記録アプリです。本ポリシーでは、本アプリが取得する情報とその取り扱いについて説明します。
      </p>

      <section>
        <h2>1. 取得する情報</h2>
        <p>Googleアカウントでのログイン時に、ユーザーの許可を得て以下の情報を取得します。</p>
        <ul>
          <li>Googleアカウントの名前、メールアドレス、プロフィール画像</li>
          <li>
            Googleカレンダーの予定を作成・編集する権限（スコープ:
            <code className="mx-1">calendar.events</code>）
          </li>
        </ul>
        <p className="mt-2">
          また、本アプリの利用に伴い、ユーザーが登録したタスクのプリセット（名前・色・階層）と、計測中の作業の情報（タスク名・開始時刻など）が作成されます。
        </p>
      </section>

      <section>
        <h2>2. 利用目的</h2>
        <ul>
          <li>ログイン状態の維持とユーザーの識別</li>
          <li>記録した作業時間を、ユーザー自身のGoogleカレンダーに予定として登録すること</li>
        </ul>
        <p className="mt-2">
          本アプリがカレンダーに対して行う操作は、ユーザーが作業を終了した際の予定の作成のみです。既存の予定を読み取ったり、変更・削除したりすることはありません。
        </p>
      </section>

      <section>
        <h2>3. 保存する情報</h2>
        <p>本アプリのデータベースには以下を保存します。</p>
        <ul>
          <li>アカウント情報（名前、メールアドレス、プロフィール画像のURL）</li>
          <li>Googleから発行された認証トークン（カレンダーへの登録に使用）</li>
          <li>タスクのプリセット</li>
          <li>計測中、またはカレンダーへの登録待ちの作業1件分の情報</li>
        </ul>
        <p className="mt-2">
          完了した作業の記録は本アプリには保存せず、Googleカレンダーにのみ残ります。
        </p>
      </section>

      <section>
        <h2>4. 第三者への提供</h2>
        <p>
          取得した情報を販売したり、広告に利用したり、第三者に提供したりすることはありません。ただし、本アプリの運用のため、以下のサービスを利用しています。
        </p>
        <ul>
          <li>Vercel（アプリのホスティング）</li>
          <li>Neon（データベース）</li>
        </ul>
      </section>

      <section>
        <h2>5. Google APIから取得したデータの取り扱い</h2>
        <p>
          本アプリによるGoogle APIから取得した情報の利用および他アプリへの転送は、Limited Use（限定使用）の要件を含む
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 underline"
            style={{ color: "var(--accent)" }}
          >
            Google API Services User Data Policy
          </a>
          に従います。
        </p>
      </section>

      <section>
        <h2>6. 連携の解除とデータの削除</h2>
        <ul>
          <li>
            本アプリとの連携は、Googleアカウントの
            <a
              href="https://myaccount.google.com/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline"
              style={{ color: "var(--accent)" }}
            >
              サードパーティ製のアプリとサービス
            </a>
            からいつでも解除できます。
          </li>
          <li>
            本アプリに保存されたデータの削除を希望する場合は、ログインに使用したメールアドレスから下記の問い合わせ先までご連絡ください。確認のうえ、すべてのデータを削除します。
          </li>
          <li>本アプリが作成したカレンダーの予定は、Googleカレンダー上で通常どおり削除できます。</li>
        </ul>
      </section>

      <section>
        <h2>7. ポリシーの変更</h2>
        <p>本ポリシーは必要に応じて改定することがあります。改定した場合は、このページの内容と最終更新日を更新します。</p>
      </section>

      <section>
        <h2>8. お問い合わせ</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
