"use client";

import { useId } from "react";
import { formatDateTime } from "@/lib/date";
import type { PayrollMonth } from "@/types/payroll";

type PayrollVersionSelectProps = { payroll: PayrollMonth; onChange: (version: number | null) => void };

// Only a month that was reopened has more than one version worth choosing between.
export function PayrollVersionSelect({ payroll, onChange }: PayrollVersionSelectProps) {
  const id = useId();
  const latest = payroll.versions[0]?.version ?? null;
  // In an open month the current view is the live estimate; in a closed one it is the latest version.
  const currentValue = payroll.status === "closed" ? String(latest) : "estimate";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="ui-label">
        Phiên bản
      </label>
      <select
        id={id}
        value={payroll.shownVersion === null ? "estimate" : String(payroll.shownVersion)}
        onChange={(event) => {
          const value = event.target.value;
          onChange(value === currentValue ? null : Number(value));
        }}
        className="ui-field w-fit max-w-64 pr-10"
      >
        {payroll.status !== "closed" && <option value="estimate">Đang sửa (tạm tính)</option>}
        {payroll.versions.map((item) => (
          <option key={item.version} value={item.version}>
            {`Bản ${item.version} · chốt ${formatDateTime(item.closedAt).slice(0, 10)}`}
            {item.reopenReason ? ` · mở lại: ${item.reopenReason}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
