"use client";

import type { ReactNode } from "react";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

// A native checkbox with role="switch" keeps Space-to-toggle and form behaviour; only the look changes.
export function Switch({ checked, onChange, label, description, disabled = false }: SwitchProps) {
  return (
    <label
      className={`flex items-start justify-between gap-4 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {description && <span className="ui-hint block">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        {/* The off track uses the muted text colour so the control keeps 3:1 contrast against the card. */}
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-[var(--muted)] transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
