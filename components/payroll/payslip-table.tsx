import Link from "next/link";
import { PayslipView } from "@/components/payroll/payslip-view";
import { ExpandableRow } from "@/components/ui/expandable-row";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatHours, formatMoney, formatSignedMoney } from "@/lib/payroll/format";
import type { Payslip } from "@/types/payroll";

const COLUMNS = 8;

type PayslipTableProps = { month: string; payslips: Payslip[]; isEstimate: boolean };

export function PayslipTable({ month, payslips, isEstimate }: PayslipTableProps) {
  const sum = (pick: (payslip: Payslip) => number) => payslips.reduce((total, payslip) => total + pick(payslip), 0);
  const year = month.slice(0, 4);

  return (
    <section aria-labelledby="payslips-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="payslips-heading" className="ui-heading">
          {isEstimate ? "Lương tạm tính" : "Phiếu lương"}
        </h2>
        <p className="ui-hint mt-1">
          Bấm vào một dòng để xem cách tính. Bấm vào tên để xem lương các tháng của người đó.
        </p>
      </div>
      {payslips.length === 0 ? (
        <p className="ui-card ui-lead text-center">
          Tháng này chưa có ai có lương: chưa có mức lương, ca hợp lệ hay khoản cộng trừ.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <caption className="sr-only">{isEstimate ? "Lương tạm tính" : "Phiếu lương"} theo nhân viên</caption>
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
                  <ExpandableRow
                    key={payslip.employeeId}
                    colSpan={COLUMNS}
                    label={`phiếu lương của ${payslip.employeeName}`}
                    cells={
                      <>
                        <th scope="row" className="font-semibold whitespace-nowrap">
                          <Link href={`/admin/payroll/employees/${payslip.employeeId}?year=${year}`} className="ui-link">
                            {payslip.employeeName}
                          </Link>
                        </th>
                        <td className="whitespace-nowrap">
                          {payslip.employmentTypes.map((type) => EMPLOYMENT_TYPE_LABELS[type]).join(", ") || "—"}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {formatHours(totals.regularMinutes + totals.overtimeMinutes)}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {formatMoney(totals.regularPay + totals.overtimePay)}
                        </td>
                        <td className="text-right whitespace-nowrap">{formatMoney(totals.fixedPay)}</td>
                        <td className="text-right whitespace-nowrap">
                          {adjustments === 0 ? "—" : formatSignedMoney(adjustments)}
                        </td>
                        <td className="text-right font-semibold whitespace-nowrap">{formatMoney(totals.total)}</td>
                      </>
                    }
                    detail={<PayslipView payslip={payslip} />}
                  />
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
      )}
    </section>
  );
}
