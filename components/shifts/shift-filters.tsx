"use client";

import { useId } from "react";
import { MonthPicker } from "@/components/ui/month-picker";
import { STATUS_LABELS } from "@/lib/shifts/labels";
import type { Branch } from "@/types/branch";
import type { ShiftStatus } from "@/types/shift";

const selectClass =
  "w-fit rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

export type ShiftFilterValues = { month: string; branchId: string; status: ShiftStatus | "" };

type ShiftFiltersProps = {
  branches: Branch[];
  value: ShiftFilterValues;
  onChange: (value: ShiftFilterValues) => void;
};

export function ShiftFilters({ branches, value, onChange }: ShiftFiltersProps) {
  const id = useId();
  return (
    <div className="flex flex-wrap gap-4">
      <MonthPicker value={value.month} onChange={(month) => onChange({ ...value, month })} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-branch`} className="font-medium">
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
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-status`} className="font-medium">
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
