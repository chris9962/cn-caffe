"use client";

import { useId, useState, type MouseEvent, type ReactNode } from "react";

type ExpandableRowProps = {
  cells: ReactNode;
  detail: ReactNode;
  colSpan: number;
  // Read by screen readers on the toggle, for example "phiếu lương của Nguyễn Thảo Vy".
  label: string;
};

// A table row that opens a detail row under it. The whole row is clickable for the mouse;
// the button in the last cell is the keyboard and screen reader control.
export function ExpandableRow({ cells, detail, colSpan, label }: ExpandableRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const detailId = useId();

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    // Links and buttons inside the row keep their own action.
    if ((event.target as HTMLElement).closest("a, button")) return;
    setIsOpen((open) => !open);
  }

  return (
    <>
      <tr onClick={handleRowClick} className={`cursor-pointer ${isOpen ? "[&>*]:bg-[var(--accent-soft)]" : ""}`}>
        {cells}
        <td className="w-12 text-right">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls={detailId}
            aria-label={`${isOpen ? "Ẩn" : "Xem"} ${label}`}
            className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className={`size-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </td>
      </tr>
      <tr id={detailId} hidden={!isOpen}>
        <td colSpan={colSpan} className="bg-[var(--background)] !p-0">
          {isOpen && <div className="px-5 py-5 sm:px-8">{detail}</div>}
        </td>
      </tr>
    </>
  );
}
