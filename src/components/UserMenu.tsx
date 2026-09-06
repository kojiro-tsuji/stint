"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null | undefined;

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = user?.name?.[0] ?? user?.email?.[0] ?? "?";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white shadow-sm"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial.toUpperCase()
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14 }}
            role="menu"
            className="surface-card absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl p-1.5"
          >
            {user?.email && (
              <div className="truncate px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
                {user.email}
              </div>
            )}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              設定
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              ログアウト
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
