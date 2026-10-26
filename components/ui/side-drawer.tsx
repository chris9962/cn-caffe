"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

type SideDrawerProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

// A panel that slides in from the right. The native <dialog> gives focus trapping, Esc and the backdrop.
export function SideDrawer({ open, title, onClose, children }: SideDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // A click on the dialog element itself, not its content, is a click on the backdrop.
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[min(34rem,100vw)] max-w-none bg-transparent p-0 backdrop:bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)] backdrop:backdrop-blur-[2px] open:animate-[drawer-in_220ms_ease-out]"
    >
      <div className="flex h-full flex-col bg-[var(--surface)] shadow-[-24px_0_48px_-32px_rgba(44,58,49,0.6)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-7">
          <div id={titleId} className="min-w-0">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
      </div>
    </dialog>
  );
}
