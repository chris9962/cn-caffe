"use client";

import { useState } from "react";
import { PickerPopover } from "@/components/ui/picker-popover";
import { currentMonth } from "@/lib/date";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

const navButtonClass =
  "inline-flex size-10 items-center justify-center rounded-full text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function toMonthValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  return `Tháng ${Number(month)}/${year}`;
}

type MonthGridProps = { value: string; onSelect: (month: string) => void };

function MonthGrid({ value, onSelect }: MonthGridProps) {
  const today = currentMonth();
  const [year, setYear] = useState(() => Number((value || today).slice(0, 4)));

  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setYear(year - 1)} aria-label={`Năm ${year - 1}`} className={navButtonClass}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <p aria-live="polite" className="font-[family-name:var(--font-display)] text-lg font-medium">
          Năm {year}
        </p>
        <button type="button" onClick={() => setYear(year + 1)} aria-label={`Năm ${year + 1}`} className={navButtonClass}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_NUMBERS.map((month) => {
          const monthValue = toMonthValue(year, month);
          const isSelected = monthValue === value;
          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelect(monthValue)}
              aria-pressed={isSelected}
              aria-current={monthValue === today ? "date" : undefined}
              data-autofocus={isSelected || undefined}
              className={`min-h-11 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                isSelected
                  ? "bg-[var(--accent)] text-[var(--surface)]"
                  : "text-[var(--foreground)] hover:bg-[var(--accent-soft)] aria-[current=date]:ring-1 aria-[current=date]:ring-[var(--accent)]"
              }`}
            >
              Tháng {month}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type MonthPickerProps = {
  value: string;
  onChange: (month: string) => void;
  // In a page toolbar the field already shows the month, so a visible label only adds height.
  hideLabel?: boolean;
};

export function MonthPicker({ value, onChange, hideLabel = false }: MonthPickerProps) {
  return (
    <PickerPopover
      label="Tháng"
      hideLabel={hideLabel}
      valueText={value ? monthLabel(value) : ""}
      placeholder="Chọn tháng"
    >
      {(close) => (
        <MonthGrid
          value={value}
          onSelect={(month) => {
            onChange(month);
            close();
          }}
        />
      )}
    </PickerPopover>
  );
}
