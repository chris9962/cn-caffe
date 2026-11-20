"use client";

import { useState } from "react";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function formatTyped(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

type TimeFieldProps = {
  id: string;
  value: string;
  onChange: (time: string) => void;
  required?: boolean;
  label?: string;
  describedBy?: string;
};

export function TimeField({ id, value, onChange, required, label, describedBy }: TimeFieldProps) {
  // A half-typed time stays on screen here while the parent only ever receives "" or a full HH:mm.
  const [draft, setDraft] = useState(value);
  const draftValue = TIME.test(draft) ? draft : "";
  if (value !== draftValue && value !== draft) {
    setDraft(value);
  }
  const isInvalid = draft.length === 5 && draftValue === "";

  return (
    <div className="relative w-fit">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--accent)]"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="--:--"
        maxLength={5}
        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
        required={required}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={isInvalid || undefined}
        value={draft}
        onChange={(event) => {
          const next = formatTyped(event.target.value);
          setDraft(next);
          onChange(TIME.test(next) ? next : "");
        }}
        className="ui-field w-32 pl-12 font-medium tabular-nums aria-[invalid=true]:border-[var(--danger)]"
      />
    </div>
  );
}
