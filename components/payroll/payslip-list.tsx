import { PayslipView } from "@/components/payroll/payslip-view";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatHours, formatMoney } from "@/lib/payroll/format";
import type { Payslip } from "@/types/payroll";

export function PayslipList({ payslips, isEstimate }: { payslips: Payslip[]; isEstimate: boolean }) {
  const grandTotal = payslips.reduce((sum, payslip) => sum + payslip.totals.total, 0);

  return (
    <section aria-labelledby="payslips-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="payslips-heading" className="ui-heading">
            {isEstimate ? "Lương tạm tính" : "Phiếu lương"}
          </h2>
          <p className="ui-hint mt-1">{payslips.length} nhân viên · bấm vào từng người để xem chi tiết.</p>
        </div>
        <p className="text-right">
          <span className="ui-hint block">Tổng quỹ lương</span>
          <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--accent-strong)]">
            {formatMoney(grandTotal)}
          </span>
        </p>
      </div>
      {payslips.length === 0 ? (
        <p className="ui-card ui-lead text-center">Tháng này chưa có ai có lương: chưa có mức lương, ca hợp lệ hay khoản cộng trừ.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payslips.map((payslip) => (
            <li key={payslip.employeeId}>
              <details className="group ui-card rounded-[1.5rem] p-0 sm:p-0">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-[1.5rem] px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                  <span className="min-w-0">
                    <span className="block font-semibold">{payslip.employeeName}</span>
                    <span className="ui-hint block">
                      {payslip.employmentTypes.map((type) => EMPLOYMENT_TYPE_LABELS[type]).join(", ") || "Chưa có mức lương"}
                      {" · "}
                      {formatHours(payslip.totals.regularMinutes + payslip.totals.overtimeMinutes)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold whitespace-nowrap">{formatMoney(payslip.totals.total)}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      className="size-5 text-[var(--muted)] transition-transform group-open:rotate-180"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-[var(--line)] px-5 py-5">
                  <PayslipView payslip={payslip} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
