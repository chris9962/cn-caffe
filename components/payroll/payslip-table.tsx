"use client";

import Link from "next/link";
import { useState } from "react";
import { PayslipView } from "@/components/payroll/payslip-view";
import { isRowControlClick, RowDetailButton } from "@/components/ui/row-detail-button";
import { SideDrawer } from "@/components/ui/side-drawer";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatHours, formatMoney, formatMonthLabel, formatSignedMoney } from "@/lib/payroll/format";
import type { Payslip } from "@/types/payroll";

type PayslipTableProps = { month: string; payslips: Payslip[]; isEstimate: boolean };

export function PayslipTable({ month, payslips, isEstimate }: PayslipTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = payslips.find((payslip) => payslip.employeeId === selectedId) ?? null;
  const sum = (pick: (payslip: Payslip) => number) => payslips.reduce((total, payslip) => total + pick(payslip), 0);
  const year = month.slice(0, 4);

  if (payslips.length === 0) {
    return <p className="ui-card ui-lead text-center">Tháng này chưa có ai có lương.</p>;
  }

  return (
    <>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <caption className="sr-only">Bảng lương {formatMonthLabel(month).toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">Nhân viên</th>
              <th scope="col">Loại</th>
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
            {payslips.map((payslip) => {
              const { totals } = payslip;
              const adjustments = totals.additions + totals.deductions;
              return (
                <tr
                  key={payslip.employeeId}
                  onClick={(event) => !isRowControlClick(event) && setSelectedId(payslip.employeeId)}
                  className="cursor-pointer"
                >
                  <th scope="row" className="font-semibold whitespace-nowrap">
                    <Link href={`/admin/payroll/employees/${payslip.employeeId}?year=${year}`} className="ui-link">
                      {payslip.employeeName}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap">
                    {payslip.employmentTypes.map((type) => EMPLOYMENT_TYPE_LABELS[type]).join(", ") || "—"}
                  </td>
                  <td className="text-right whitespace-nowrap">{formatHours(totals.regularMinutes + totals.overtimeMinutes)}</td>
                  <td className="text-right whitespace-nowrap">{formatMoney(totals.regularPay + totals.overtimePay)}</td>
                  <td className="text-right whitespace-nowrap">{formatMoney(totals.fixedPay)}</td>
                  <td className="text-right whitespace-nowrap">{adjustments === 0 ? "—" : formatSignedMoney(adjustments)}</td>
                  <td className="text-right font-semibold whitespace-nowrap">{formatMoney(totals.total)}</td>
                  <td className="w-12 text-right">
                    <RowDetailButton label={`Xem phiếu lương của ${payslip.employeeName}`} onClick={() => setSelectedId(payslip.employeeId)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="[&>td]:border-t-2 [&>td]:border-[var(--line)] [&>td]:font-semibold">
              <td colSpan={2}>Tổng {payslips.length} người</td>
              <td className="text-right whitespace-nowrap">
                {formatHours(sum((payslip) => payslip.totals.regularMinutes + payslip.totals.overtimeMinutes))}
              </td>
              <td className="text-right whitespace-nowrap">
                {formatMoney(sum((payslip) => payslip.totals.regularPay + payslip.totals.overtimePay))}
              </td>
              <td className="text-right whitespace-nowrap">{formatMoney(sum((payslip) => payslip.totals.fixedPay))}</td>
              <td className="text-right whitespace-nowrap">
                {formatSignedMoney(sum((payslip) => payslip.totals.additions + payslip.totals.deductions))}
              </td>
              <td className="text-right whitespace-nowrap text-[var(--accent-strong)]">
                {formatMoney(sum((payslip) => payslip.totals.total))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <SideDrawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={
          selected && (
            <>
              <p className="font-[family-name:var(--font-display)] text-xl font-medium">{selected.employeeName}</p>
              <p className="ui-hint">
                {formatMonthLabel(month)} · {isEstimate ? "tạm tính" : "đã chốt"}
              </p>
            </>
          )
        }
      >
        {selected && <PayslipView payslip={selected} />}
      </SideDrawer>
    </>
  );
}
