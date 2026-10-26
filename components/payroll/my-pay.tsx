"use client";

import { useState } from "react";
import { PayslipView } from "@/components/payroll/payslip-view";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth } from "@/lib/date";
import { formatMonthLabel } from "@/lib/payroll/format";
import type { MyPay as MyPayData } from "@/types/payroll";

export function MyPay() {
  const [month, setMonth] = useState(() => currentMonth());
  // A cleared month input gives "", which the API would reject as an invalid month.
  const { data, error, isLoading } = useFetch<MyPayData>(
    month === "" ? null : `/api/payroll/mine?month=${encodeURIComponent(month)}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <MonthPicker value={month} onChange={setMonth} />
      {isLoading ? (
        <Loading label="Đang tính lương..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        data && (
          <section aria-labelledby="my-pay-heading" className="ui-card flex flex-col gap-4 rounded-[2rem]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="my-pay-heading" className="ui-heading">
                {formatMonthLabel(data.month)}
              </h2>
              {data.isEstimate ? (
                <span className="rounded-full bg-[var(--bloom-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                  Tạm tính
                </span>
              ) : (
                <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
                  Đã chốt
                </span>
              )}
            </div>
            {data.isEstimate && (
              <p className="ui-hint">
                Số này còn đổi khi ca được duyệt, sửa giờ hoặc có khoản thưởng, trừ mới. Lương chính thức có sau khi quán chốt
                tháng.
              </p>
            )}
            {data.payslip ? (
              <PayslipView payslip={data.payslip} />
            ) : (
              <p className="ui-lead">Tháng này chưa có lương nào được tính cho bạn.</p>
            )}
          </section>
        )
      )}
    </div>
  );
}
