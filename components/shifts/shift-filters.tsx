"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { MonthPicker } from "@/components/ui/month-picker";
import { currentMonth, formatDate } from "@/lib/date";
import { STATUS_LABELS } from "@/lib/shifts/labels";
import type { Branch } from "@/types/branch";
import type { ShiftStatus } from "@/types/shift";

export type ShiftFilterValues = { month: string; date: string; branchId: string; status: ShiftStatus | "" };

const STATUS_OPTIONS: Array<[ShiftStatus | "", string]> = [
  ["", "Tất cả"],
  ...(Object.keys(STATUS_LABELS) as ShiftStatus[]).map((status): [ShiftStatus, string] => [status, STATUS_LABELS[status]]),
];

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

// Day 0 of the next month is the last day of this one.
function monthBounds(month: string) {
  if (month === "") return {};
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { min: `${month}-01`, max: `${month}-${String(last).padStart(2, "0")}` };
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${Number(monthNumber)}/${year}`;
}

type ShiftFilterFormProps = {
  branches: Branch[];
  initial: ShiftFilterValues;
  onApply: (value: ShiftFilterValues) => void;
};

// Works on a draft so the list reloads once on "Áp dụng" instead of after every field.
function ShiftFilterForm({ branches, initial, onApply }: ShiftFilterFormProps) {
  const id = useId();
  const [draft, setDraft] = useState(initial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <MonthPicker value={draft.month} onChange={(month) => setDraft({ ...draft, month, date: "" })} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-date`} className="ui-label">
          Ngày
        </label>
        <input
          id={`${id}-date`}
          type="date"
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          {...monthBounds(draft.month)}
          className="ui-field w-fit"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-branch`} className="ui-label">
          Chi nhánh
        </label>
        <select
          id={`${id}-branch`}
          value={draft.branchId}
          onChange={(event) => setDraft({ ...draft, branchId: event.target.value })}
          className="ui-field"
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="ui-label mb-2">Trạng thái</legend>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(([status, label]) => (
            <label key={status || "all"}>
              <input
                type="radio"
                name={`${id}-status`}
                value={status}
                checked={draft.status === status}
                onChange={() => setDraft({ ...draft, status })}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-[var(--line)] px-4 text-sm font-semibold peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] peer-checked:text-[var(--surface)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setDraft({ month: currentMonth(), date: "", branchId: "", status: "" })}
          className="ui-btn-quiet"
        >
          Đặt lại
        </button>
        {/* A cleared month input gives "", which the API would reject as an invalid month. */}
        <button type="submit" disabled={draft.month === ""} className="ui-btn flex-1">
          Áp dụng
        </button>
      </div>
    </form>
  );
}

type ShiftFiltersProps = {
  branches: Branch[];
  value: ShiftFilterValues;
  onChange: (value: ShiftFilterValues) => void;
};

export function ShiftFilters({ branches, value, onChange }: ShiftFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const activeFilters: Array<{ label: string; clear: Partial<ShiftFilterValues> }> = [];
  if (value.date !== "") activeFilters.push({ label: `Ngày ${formatDate(value.date)}`, clear: { date: "" } });
  if (value.branchId !== "") {
    const branchName = branches.find((branch) => branch.id === value.branchId)?.name ?? "Chi nhánh";
    activeFilters.push({ label: branchName, clear: { branchId: "" } });
  }
  if (value.status !== "") activeFilters.push({ label: STATUS_LABELS[value.status], clear: { status: "" } });

  function removeFilter(clear: Partial<ShiftFilterValues>) {
    onChange({ ...value, ...clear });
    // The removed chip unmounts, so focus moves to the filter button, which always stays.
    filterButtonRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{monthLabel(value.month)}</p>
        <button
          ref={filterButtonRef}
          type="button"
          aria-haspopup="dialog"
          onClick={() => setIsOpen(true)}
          className="ui-btn-quiet min-h-11 px-4"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Bộ lọc
          {activeFilters.length > 0 && (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs text-[var(--surface)]">
              <span className="sr-only">, đang bật </span>
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>
      {activeFilters.length > 0 && (
        <ul aria-label="Bộ lọc đang bật" className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <li key={filter.label}>
              <button
                type="button"
                onClick={() => removeFilter(filter.clear)}
                aria-label={`Bỏ lọc ${filter.label}`}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--accent-soft)] pr-2.5 pl-3.5 text-sm font-semibold text-[var(--accent-strong)] ${focusClass}`}
              >
                {filter.label}
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
                  <path d="M7 7l10 10M17 7 7 17" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={isOpen} title="Bộ lọc" onClose={() => setIsOpen(false)}>
        {/* Mounted only while open, so each opening starts from the filters in use. */}
        {isOpen && (
          <ShiftFilterForm
            branches={branches}
            initial={value}
            onApply={(next) => {
              onChange(next);
              setIsOpen(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
