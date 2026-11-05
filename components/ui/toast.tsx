"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

const TOAST_MS = 2500;

type ToastMessage = { id: number; text: string };

export const ToastContext = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // A new object per call restarts the timer even when the same text is shown twice in a row.
  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={showToast}>
      {children}
      {/* Always mounted so screen readers announce each message; 5.5rem clears the phone bottom nav. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6"
      >
        {toast && (
          <p
            key={toast.id}
            className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)] shadow-[0_12px_32px_-12px_rgba(81,40,34,0.6)] motion-safe:animate-[toast-in_180ms_ease-out]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="m5 12 4 4L19 6" />
            </svg>
            {toast.text}
          </p>
        )}
      </div>
    </ToastContext>
  );
}
