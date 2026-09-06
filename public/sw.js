// 意図的に何もキャッシュしない（v1はオフライン対応をスコープ外としている）。
// PWAのインストール可能性要件（ホーム画面への追加）を満たすためだけに登録する。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: すべてのリクエストは素通しでネットワークに委譲する
});
