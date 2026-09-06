"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const TONE_STYLE: Record<ToastTone, { bg: string; text: string }> = {
  error: { bg: "linear-gradient(135deg, #ef4444, #dc2626)", text: "#fff" },
  success: { bg: "linear-gradient(135deg, #22c55e, #16a34a)", text: "#fff" },
  info: { bg: "var(--surface-solid)", text: "var(--foreground)" },
};

export function ToastViewport({ toast }: { toast: ToastState }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(var(--safe-bottom) + 1.5rem)" }}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="surface-card pointer-events-auto max-w-sm rounded-full px-4 py-2.5 text-center text-sm font-medium"
            style={{ background: TONE_STYLE[toast.tone].bg, color: TONE_STYLE[toast.tone].text }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
