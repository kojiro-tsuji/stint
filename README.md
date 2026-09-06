# Stint

スマートフォンの「スライドして電源オフ」に似たスワイプ操作で、タスクの開始と終了を記録するWebアプリケーション。記録された作業時間は、そのままGoogleカレンダーに予定として書き込まれる。

**Live Demo**: https://stint-app-kojiro-tsujis-projects.vercel.app

> ログイン時に「このアプリは Google で確認されていません」という警告画面が表示されます。「詳細」→「stint(安全ではないページ)に移動」で続行できます（個人開発のため、Google審査は未申請です）。

## コンセプト

「時間を測る」ことよりも、**開始と終了の意思表示を明確な身体動作にする**ことに主眼を置いている。ボタンの誤タップで計測が始まる／止まることを防ぎ、「今から始める」「今終わった」という区切りを操作そのものに持たせた。

```
1. Googleアカウントでログイン
2. これから行うタスクをプリセットから選択（最大3階層のツリーを辿る）
3. 左 → 右にスワイプ  … タスク開始（計測スタート）
4. （作業中：経過時間をリアルタイム表示）
5. 右 → 左にスワイプ  … タスク終了
6. 開始〜終了の時間帯がGoogleカレンダーに予定として自動登録される
```

## 設計を貫く3つの原則

| 原則 | 内容 |
|---|---|
| **カレンダーが唯一の記録元** | 完了した作業記録はアプリのDBに持たない。Googleカレンダーだけを正本とすることで、二重管理による不整合を避ける |
| **時刻はサーバーが打つ** | クライアントの時計を信用しない。開始・終了のタイムスタンプは常にサーバー側で確定させる |
| **開始したものは失わない** | 通信断・タブ閉じ・端末変更のいずれでも、計測中のデータが消えないようDB上に保持する |

## 機能

- **Google認証**（Auth.js / OAuth 2.0）
- **プリセット管理**: タスク種別を最大3階層のツリーで登録・編集・アーカイブ・削除
- **スワイプ操作**: ドラッグ、または1秒間の長押しでも確定できるアクセシブルな実装
- **経過時間のリアルタイム表示**（タブが非アクティブでもズレない実装）
- **セッション復元**: 別タブ・別端末からアクセスしても進行中の計測を復元
- **カレンダー同期のリトライ**: 登録に失敗しても作業時間は失われず、手動で再送可能
- **PWA対応**: ホーム画面に追加してネイティブアプリのように利用可能

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router, Route Handlers) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| スワイプUI | Framer Motion |
| 認証 | Auth.js (NextAuth v5, database session strategy) |
| ORM | Prisma |
| バリデーション | Zod |
| データ取得 | SWR |
| データベース | PostgreSQL (Neon) |
| ホスティング | Vercel |
| 外部API | Google Calendar API v3（`googleapis` は使わず `fetch` で直接呼び出し） |

### 技術的なポイント

- **カレンダー登録の冪等性**: セッションIDをそのままGoogleカレンダーのイベントIDとして利用（base32hex準拠の専用ID生成）。通信断による再送があっても、Google側が重複を`409`で弾いてくれるため二重登録が起きない
- **リフレッシュトークンの保護**: Googleは初回認可時にしか`refresh_token`を返さない。再ログイン時に`undefined`で上書きしてしまうとカレンダー連携が恒久的に壊れるため、`signIn`コールバックで既存値を保護している
- **行の有無で状態を表現**: 進行中セッションは列挙型のステータスを持たず、「行が存在し`endedAt`が`null`」＝計測中、「`endedAt`が入っている」＝同期リトライ待ち、「行が削除済み」＝完了、という形でDBスキーマ自体が状態を表す
- **`userId`の一意制約による排他制御**: 1ユーザーにつき進行中セッションは1件までを、アプリケーションロジックではなくDBの`@unique`制約で保証

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx                 # メイン画面（プリセット選択→スワイプ）
│   ├── login/page.tsx
│   ├── settings/page.tsx        # プリセット管理
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── presets/             # プリセットCRUD
│       └── session/             # start / end / retry
├── components/                  # SwipeToConfirm, PresetPicker など
├── lib/                         # auth, prisma, google-calendar, validations など
└── types/
prisma/
└── schema.prisma
```

## ローカルでの動かし方

### 前提

- Node.js 20+
- PostgreSQL（[Neon](https://neon.tech) の無料枠、または `npx prisma dev` でローカルに一時的なPostgresを起動可能）
- Google Cloud Console のプロジェクト（OAuthクライアント）

### セットアップ

```bash
npm install
cp .env.example .env
# .env を編集（下記参照）
npx prisma migrate dev
npm run dev
```

### 環境変数（`.env`）

```bash
DATABASE_URL="postgresql://..."     # 末尾に &pgbouncer=true を推奨（下記の詰まりポイント参照）
AUTH_SECRET="..."                   # openssl rand -base64 32
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="..."
```

### Google Cloud Console 側の設定

1. OAuth 2.0 クライアントID（種類: ウェブアプリケーション）を作成
2. 承認済みリダイレクトURI: `{AUTH_URL}/api/auth/callback/google`
3. Google Calendar API を有効化
4. OAuth同意画面のスコープに `calendar.events` を追加
5. 公開ステータスを「本番環境」に変更（「テスト」のままだとリフレッシュトークンが7日で失効する）

## デプロイ

Vercel + Neon を想定。`vercel-build`スクリプトが`prisma migrate deploy`を自動実行するため、環境変数さえ揃えれば`git push`だけでスキーマも追従する。

```json
"vercel-build": "prisma migrate deploy && next build"
```

## つまずいたポイント（開発ログ）

- **PgBouncer経由の接続で`prepared statement already exists`エラー**: サーバーレス環境やコネクションプーラー経由だと、Prismaのプリペアドステートメントが衝突することがある。`DATABASE_URL`の末尾に`&pgbouncer=true`を付けて解決
- **Googleの`refresh_token`が2回目のログインから消える**: `prompt=consent`を付けない設計にした副作用。`signIn`コールバックで「新しい値が来たときだけ上書きする」（`??`演算子）ガードを入れないと、再ログインのたびにカレンダー連携が壊れる
- **本番環境限定の`There is a problem with the server configuration`エラー**: 原因はサーバー側のバグではなく、開発中に`AUTH_SECRET`やDBスキーマを変更したことで無効になった、ブラウザ側の古いCookieだった。シークレットウィンドウで検証してすぐに切り分けられた

## v1でやらないこと

- 一時停止・再開機能
- 複数タスクの同時進行
- アプリ側での作業履歴の保持（Googleカレンダーが唯一の記録元）
- オフライン対応
- Google OAuthアプリ審査（個人利用の範囲を超えたら検討）
