"use client";

import { useId } from "react";
import type { Branch, BranchWithDistance } from "@/types/branch";

type BranchPickerProps = {
  branches: Array<Branch | BranchWithDistance>;
  value: string;
  onChange: (branchId: string) => void;
};

export function BranchPicker({ branches, value, onChange }: BranchPickerProps) {
  // Next keeps visited pages mounted but hidden, so the check-in page and the manual shift form can coexist.
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="ui-label">
        Chi nhánh
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-field"
      >
        {value === "" && <option value="">Chọn chi nhánh</option>}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {"distanceM" in branch ? `${branch.name} — ${Math.round(branch.distanceM)} m` : branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
