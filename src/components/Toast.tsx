"use client";

import { useCallback, useRef, useState } from "react";

export type ToastTone = "info" | "error" | "success";
type ToastState = { id: number; message: string; tone: ToastTone } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: ToastTone = "info", durationMs = 4000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = Date.now();
    setToast({ id, message, tone });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
    }, durationMs);
  }, []);

  return { toast, show };
}

export function ToastViewport({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const toneClass =
    toast.tone === "error" ? "bg-red-600" : toast.tone === "success" ? "bg-gray-900" : "bg-gray-700";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto max-w-sm rounded-full px-4 py-2 text-center text-sm text-white shadow-lg ${toneClass}`}
      >
        {toast.message}
      </div>
    </div>
  );
}
