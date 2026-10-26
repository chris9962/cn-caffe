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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="ui-title">Bảng lương</h1>
          <p className="ui-lead mt-2">Tạm tính trong tháng, chốt khi tháng kết thúc, rồi tải Excel.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {error ? (
        <ErrorMessage message={error} />
      ) : !data || (isLoading && data.month !== month) ? (
        <Loading label="Đang tính bảng lương..." />
      ) : (
        <>
          <PayrollActions payroll={data} onChanged={handleChanged} />
          {data.status !== "closed" && data.blockingShifts.length > 0 && <BlockingShiftList shifts={data.blockingShifts} />}
          <PayslipTable month={data.month} payslips={data.payslips} isEstimate={data.shownVersion === null} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <PayAdjustmentSection
              key={data.month}
              month={data.month}
              isLocked={data.status !== "open"}
              onChanged={reload}
            />
            {data.versions.length > 0 && (
              <PayrollVersionList
                versions={data.versions}
                shownVersion={data.shownVersion}
                onShow={(next) => setPicked({ month: data.month, version: next })}
                onShowCurrent={version === null ? null : () => setPicked(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
