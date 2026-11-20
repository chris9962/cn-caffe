"use client";

import { useId, useState, type ReactNode, type ToggleEvent } from "react";

type PickerPopoverProps = {
  label: string;
  hideLabel?: boolean;
  valueText: string;
  placeholder: string;
  children: (close: () => void) => ReactNode;
};

export function PickerPopover({ label, hideLabel = false, valueText, placeholder, children }: PickerPopoverProps) {
  // useId may contain characters that are not valid in a CSS anchor name.
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const triggerId = `${baseId}-trigger`;
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const panelId = `${baseId}-panel`;
  const anchorName = `--picker-${baseId}`;
  const [isOpen, setIsOpen] = useState(false);

  function handleBeforeToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState === "open") setIsOpen(true);
  }

  // The content mounts while the panel is still hidden, so focus can only move in once the panel shows.
  function handleToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState === "open") {
      event.currentTarget.querySelector<HTMLElement>("[data-autofocus], [tabindex='0']")?.focus();
    } else {
      setIsOpen(false);
    }
  }

  function close() {
    document.getElementById(panelId)?.hidePopover();
    document.getElementById(triggerId)?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label id={labelId} htmlFor={triggerId} className={hideLabel ? "sr-only" : "ui-label"}>
        {label}
      </label>
      <button
        id={triggerId}
        type="button"
        popoverTarget={panelId}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={`${labelId} ${valueId}`}
        style={{ anchorName }}
        className="ui-field flex w-fit min-w-44 items-center gap-2.5 text-left"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0 text-[var(--accent)]">
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span id={valueId} className={`flex-1 whitespace-nowrap ${valueText ? "font-medium" : "text-[var(--muted)]"}`}>
          {valueText || placeholder}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-[var(--muted)]">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={panelId}
        popover="auto"
        role="dialog"
        aria-labelledby={labelId}
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
        style={{ positionAnchor: anchorName }}
        className="ui-picker-panel"
      >
        {isOpen && children(close)}
      </div>
    </div>
  );
}
