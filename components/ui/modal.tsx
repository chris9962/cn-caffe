"use client";

import { useId, type MouseEvent, type ReactNode } from "react";
import { useModalDialog } from "@/hooks/use-modal-dialog";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// A bottom sheet on phones, where it stays in thumb reach, and a centred dialog on wider screens.
export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useModalDialog(open);
  const titleId = useId();

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
      className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-[1.75rem] bg-[var(--surface)] p-0 text-[var(--foreground)] backdrop:bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)] backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-md sm:rounded-[1.75rem]"
    >
      <div className="flex flex-col gap-5 px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="ui-heading text-xl">
            {title}
          </h2>
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
        {children}
      </div>
    </dialog>
  );
}
