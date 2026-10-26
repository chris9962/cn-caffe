"use client";

import { useState } from "react";
import { BlockingShiftList } from "@/components/payroll/blocking-shift-list";
import { PayrollActions } from "@/components/payroll/payroll-actions";
import { PayrollVersionSelect } from "@/components/payroll/payroll-version-select";
import { PayslipTable } from "@/components/payroll/payslip-table";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth } from "@/lib/date";
import type { PayrollMonth } from "@/types/payroll";

// An open month offers its estimate plus every closed version; a closed month offers its versions.
function hasVersionChoice(payroll: PayrollMonth) {
  return payroll.versions.length + (payroll.status === "closed" ? 0 : 1) > 1;
}

export function PayrollBoard() {
  const [month, setMonth] = useState(() => currentMonth());
  // Tied to its month, so picking another month drops back to that month's current view.
  const [picked, setPicked] = useState<{ month: string; version: number } | null>(null);
  const version = picked?.month === month ? picked.version : null;
  const url =
    month === ""
      ? null
      : `/api/admin/payroll?month=${encodeURIComponent(month)}${version === null ? "" : `&version=${version}`}`;
  const { data, error, isLoading, reload } = useFetch<PayrollMonth>(url);

  function handleChanged() {
    setPicked(null);
    reload();
  }

  // While another month loads, the old month's data must not show under the new month.
  const payroll = data !== null && !(isLoading && data.month !== month) ? data : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="ui-title">Bảng lương</h1>
          {payroll?.status === "closed" && (
            <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
              Đã chốt
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          {payroll && hasVersionChoice(payroll) && (
            <PayrollVersionSelect
              payroll={payroll}
              onChange={(next) => setPicked(next === null ? null : { month: payroll.month, version: next })}
            />
          )}
          {payroll && <PayrollActions payroll={payroll} onChanged={handleChanged} />}
        </div>
      </div>

      {error ? (
        <ErrorMessage message={error} />
      ) : !payroll ? (
        <Loading label="Đang tính bảng lương..." />
      ) : (
        <>
          {payroll.status !== "closed" && payroll.blockingShifts.length > 0 && <BlockingShiftList shifts={payroll.blockingShifts} />}
          <PayslipTable
            month={payroll.month}
            payslips={payroll.payslips}
            isEstimate={payroll.shownVersion === null}
            onAdjustmentsChanged={payroll.status === "open" && payroll.shownVersion === null ? reload : null}
          />
        </>
      )}
    </div>
  );
}
