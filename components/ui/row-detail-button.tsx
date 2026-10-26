import type { MouseEvent } from "react";

// Links and buttons inside a clickable row keep their own action; anywhere else on the row opens the detail.
export function isRowControlClick(event: MouseEvent) {
  return (event.target as HTMLElement).closest("a, button") !== null;
}

// The keyboard and screen reader way to open a row's detail when the row itself is clickable.
export function RowDetailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-5">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}
