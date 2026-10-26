"use client";

import { useState } from "react";
import { BlockingShiftList } from "@/components/payroll/blocking-shift-list";
import { PayAdjustmentSection } from "@/components/payroll/pay-adjustment-section";
import { PayrollActions } from "@/components/payroll/payroll-actions";
import { PayrollVersionList } from "@/components/payroll/payroll-version-list";
import { PayslipTable } from "@/components/payroll/payslip-table";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth } from "@/lib/date";
import type { PayrollMonth } from "@/types/payroll";

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
          <PayslipTable month={payroll.month} payslips={payroll.payslips} isEstimate={payroll.shownVersion === null} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <PayAdjustmentSection
              key={payroll.month}
              month={payroll.month}
              isLocked={payroll.status !== "open"}
              onChanged={reload}
            />
            {payroll.versions.length > 0 && (
              <PayrollVersionList
                versions={payroll.versions}
                shownVersion={payroll.shownVersion}
                onShow={(next) => setPicked({ month: payroll.month, version: next })}
                onShowCurrent={version === null ? null : () => setPicked(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
