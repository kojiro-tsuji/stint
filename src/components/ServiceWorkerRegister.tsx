"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // インストール可能性のための登録が失敗しても機能に影響はないため無視する
      });
    }
  }, []);
  return null;
}
