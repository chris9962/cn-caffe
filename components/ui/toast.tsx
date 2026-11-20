"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";

// An error usually has to be read before the user can fix it, so it stays longer.
const TOAST_MS: Record<ToastTone, number> = { success: 2500, error: 6000 };

type ToastMessage = { id: number; text: string; tone: ToastTone };

export const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});

function ToastBubble({ toast }: { toast: ToastMessage }) {
  const isError = toast.tone === "error";
  return (
    <p
      className={`flex max-w-md items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-[var(--surface)] shadow-[0_12px_32px_-12px_rgba(81,40,34,0.6)] motion-safe:animate-[toast-in_180ms_ease-out] ${
        isError ? "bg-[var(--danger)]" : "bg-[var(--foreground)]"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
        {isError ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.5h.01" />
          </>
        ) : (
          <path d="m5 12 4 4L19 6" />
        )}
      </svg>
      {toast.text}
    </p>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // A new object per call restarts the timer even when the same text is shown twice in a row.
  const showToast = useCallback(
    (text: string, tone: ToastTone = "success") => setToast({ id: Date.now(), text, tone }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS[toast.tone]);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={showToast}>
      {children}
      {/* Both regions stay mounted so screen readers announce each message; 5.5rem clears the phone bottom nav. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6">
        <div role="status">{toast?.tone === "success" && <ToastBubble key={toast.id} toast={toast} />}</div>
        <div role="alert">{toast?.tone === "error" && <ToastBubble key={toast.id} toast={toast} />}</div>
      </div>
    </ToastContext>
  );
}
