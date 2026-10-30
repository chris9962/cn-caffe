"use client";

import Link from "next/link";
import { use, useId, useState } from "react";
import { PayslipView } from "@/components/payroll/payslip-view";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { isRowControlClick, RowDetailButton } from "@/components/ui/row-detail-button";
import { SideDrawer } from "@/components/ui/side-drawer";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth } from "@/lib/date";
import { formatHours, formatMonthLabel, formatMoney, formatSignedMoney } from "@/lib/payroll/format";
import type { EmployeePayHistory as PayHistory } from "@/types/payroll";

const YEARS_SHOWN = 5;

type EmployeePayHistoryProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
};

export function EmployeePayHistory({ params, searchParams }: EmployeePayHistoryProps) {
  const { id } = use(params);
  const { year: yearParam } = use(searchParams);
  const thisYear = Number(currentMonth().slice(0, 4));
  const [year, setYear] = useState(() => {
    const requested = Number(yearParam);
    return Number.isInteger(requested) && requested > 2000 && requested <= thisYear ? requested : thisYear;
  });
  const yearSelectId = useId();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const { data, error, isLoading } = useFetch<PayHistory>(`/api/admin/payroll/employees/${id}?year=${year}`);
  const months = data?.year === year ? data.months : null;
  const yearTotal = months?.reduce((sum, item) => sum + item.payslip.totals.total, 0) ?? 0;
  const selected = months?.find((item) => item.month === selectedMonth) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ui-eyebrow mb-2">
            <Link href="/admin/payroll" className="hover:underline">
              Bảng lương
            </Link>{" "}
            · lịch sử
          </p>
          <h1 className="ui-title">{data?.employee.fullName ?? "Lương theo tháng"}</h1>
          {data?.canManage && (
            <Link href={`/admin/employees/${id}`} className="ui-link mt-1 inline-block text-sm">
              Hồ sơ và mức lương
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={yearSelectId} className="ui-label">
            Năm
          </label>
          <select
            id={yearSelectId}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="ui-field w-fit pr-10"
          >
            {Array.from({ length: YEARS_SHOWN }, (_, index) => thisYear - index).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <ErrorMessage message={error} />
      ) : !months || isLoading ? (
        <Loading label="Đang tính lương các tháng..." />
      ) : months.length === 0 ? (
        <p className="ui-card ui-lead text-center">Năm {year} chưa có tháng nào có lương.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <caption className="sr-only">Lương từng tháng năm {year}</caption>
            <thead>
              <tr>
                <th scope="col">Tháng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-right">Giờ làm</th>
                <th scope="col" className="text-right">Tiền theo giờ</th>
                <th scope="col" className="text-right">Lương cố định</th>
                <th scope="col" className="text-right">Cộng / trừ</th>
                <th scope="col" className="text-right">Tổng lương</th>
                <th scope="col">
                  <span className="sr-only">Chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map(({ month, version, payslip }) => {
                const { totals } = payslip;
                const adjustments = totals.additions + totals.deductions;
                return (
                  <tr
                    key={month}
                    onClick={(event) => !isRowControlClick(event) && setSelectedMonth(month)}
                    className="cursor-pointer"
                  >
                    <th scope="row" className="font-semibold whitespace-nowrap">
                      {formatMonthLabel(month)}
                    </th>
                    <td>
                      {version === null ? (
                        <span className="rounded-full bg-[var(--bloom-soft)] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[var(--warning)]">
                          Tạm tính
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[var(--success)]">
                          Đã chốt · v{version}
                        </span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">{formatHours(totals.regularMinutes + totals.overtimeMinutes)}</td>
                    <td className="text-right whitespace-nowrap">{formatMoney(totals.regularPay + totals.overtimePay)}</td>
                    <td className="text-right whitespace-nowrap">{formatMoney(totals.fixedPay)}</td>
                    <td className="text-right whitespace-nowrap">{adjustments === 0 ? "—" : formatSignedMoney(adjustments)}</td>
                    <td className="text-right font-semibold whitespace-nowrap">{formatMoney(totals.total)}</td>
                    <td className="w-12 text-right">
                      <RowDetailButton
                        label={`Xem phiếu lương ${formatMonthLabel(month).toLowerCase()}`}
                        onClick={() => setSelectedMonth(month)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="[&>td]:border-t-2 [&>td]:border-[var(--line)] [&>td]:font-semibold">
                <td colSpan={6}>Cả năm {year}</td>
                <td className="text-right whitespace-nowrap text-[var(--accent-strong)]">{formatMoney(yearTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <SideDrawer
        open={selected !== null}
        onClose={() => setSelectedMonth(null)}
        title={
          selected && (
            <>
              <p className="font-[family-name:var(--font-display)] text-xl font-medium">{formatMonthLabel(selected.month)}</p>
              <p className="ui-hint">
                {data?.employee.fullName} · {selected.version === null ? "tạm tính" : `đã chốt, phiên bản ${selected.version}`}
              </p>
            </>
          )
        }
      >
        {selected && <PayslipView payslip={selected.payslip} />}
      </SideDrawer>
    </div>
  );
}
