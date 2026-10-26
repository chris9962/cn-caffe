"use client";

import { useId } from "react";
import { MonthPicker } from "@/components/ui/month-picker";
import { STATUS_LABELS } from "@/lib/shifts/labels";
import type { Branch } from "@/types/branch";
import type { ShiftStatus } from "@/types/shift";

const selectClass =
  "ui-field w-fit";

export type ShiftFilterValues = { month: string; date: string; branchId: string; status: ShiftStatus | "" };

type ShiftFiltersProps = {
  branches: Branch[];
  value: ShiftFilterValues;
  onChange: (value: ShiftFilterValues) => void;
};

// Day 0 of the next month is the last day of this one.
function monthBounds(month: string) {
  if (month === "") return {};
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { min: `${month}-01`, max: `${month}-${String(last).padStart(2, "0")}` };
}

export function ShiftFilters({ branches, value, onChange }: ShiftFiltersProps) {
  const id = useId();
  return (
    <div className="ui-card flex flex-wrap items-end gap-4">
      <MonthPicker value={value.month} onChange={(month) => onChange({ ...value, month, date: "" })} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-date`} className="ui-label">
          Ngày
        </label>
        <input
          id={`${id}-date`}
          type="date"
          value={value.date}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
          {...monthBounds(value.month)}
          className={selectClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-branch`} className="ui-label">
          Chi nhánh
        </label>
        <select
          id={`${id}-branch`}
          value={value.branchId}
          onChange={(event) => onChange({ ...value, branchId: event.target.value })}
          className={selectClass}
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-status`} className="ui-label">
          Trạng thái
        </label>
        <select
          id={`${id}-status`}
          value={value.status}
          onChange={(event) => onChange({ ...value, status: event.target.value as ShiftStatus | "" })}
          className={selectClass}
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(STATUS_LABELS) as ShiftStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
