import { formatDate, formatTime } from "@/lib/date";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatHours, formatMoney, formatSignedMoney } from "@/lib/payroll/format";
import { formatCheckOut } from "@/lib/shifts/labels";
import type { Payslip } from "@/types/payroll";

function SummaryRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt>
        {label}
        {hint && <span className="ui-hint block text-xs">{hint}</span>}
      </dt>
      <dd className="font-semibold whitespace-nowrap">{value}</dd>
    </div>
  );
}

export function PayslipView({ payslip }: { payslip: Payslip }) {
  const { totals, config } = payslip;
  const hasPartTime = payslip.shifts.some((shift) => shift.employmentType === "part_time");
  const unpaidShifts = payslip.shifts.filter((shift) => shift.employmentType === null).length;

  return (
    <div className="flex flex-col gap-5">
      <dl className="divide-y divide-[var(--line)] text-sm">
        {hasPartTime && (
          <>
            <SummaryRow label="Giờ thường" value={formatHours(totals.regularMinutes)} />
            <SummaryRow
              label="Giờ tăng ca"
              value={formatHours(totals.overtimeMinutes)}
              hint={`Khung ${config.overtimeStart} – ${config.overtimeEnd}, ${formatMoney(config.overtimeHourlyRate)}/giờ`}
            />
            <SummaryRow label="Tiền giờ thường" value={formatMoney(totals.regularPay)} />
            <SummaryRow label="Tiền tăng ca" value={formatMoney(totals.overtimePay)} />
          </>
        )}
        {payslip.fixedSegments.map((segment) => (
          <SummaryRow
            key={segment.from}
            label="Lương cố định"
            hint={`${formatDate(segment.from)} – ${formatDate(segment.to)}: ${segment.days} ngày × ${formatMoney(segment.monthlyAmount)}/tháng`}
            value={formatMoney(segment.pay)}
          />
        ))}
        {payslip.adjustments.map((item) => (
          <SummaryRow key={item.id} label={item.amount > 0 ? "Cộng thêm" : "Trừ"} hint={item.note} value={formatSignedMoney(item.amount)} />
        ))}
        <div className="flex items-baseline justify-between gap-4 pt-4">
          <dt className="font-[family-name:var(--font-display)] text-lg">Tổng lương</dt>
          <dd className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--accent-strong)]">
            {formatMoney(totals.total)}
          </dd>
        </div>
      </dl>

      {payslip.shifts.length === 0 && payslip.fixedSegments.length === 0 && payslip.adjustments.length === 0 && (
        <p className="ui-hint">
          Chưa có ca hợp lệ nào trong tháng. Ca đang làm hoặc chờ duyệt sẽ được tính khi đã hợp lệ.
        </p>
      )}

      {unpaidShifts > 0 && (
        <p className="rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          {unpaidShifts} ca chưa có mức lương áp dụng nên chưa được tính tiền.
        </p>
      )}

      {payslip.branches.length > 0 && (
        <div>
          <h3 className="ui-label mb-2">Giờ làm theo chi nhánh</h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {payslip.branches.map((branch) => (
              <li key={branch.branchId} className="rounded-full bg-[var(--background)] px-3 py-1">
                {branch.branchName || "Chi nhánh đã đóng"}: <strong>{formatHours(branch.minutes)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {payslip.shifts.length > 0 && (
        <details className="group/shifts">
          <summary className="ui-link w-fit cursor-pointer list-none text-sm">
            <span className="group-open/shifts:hidden">Xem {payslip.shifts.length} ca được tính</span>
            <span className="hidden group-open/shifts:inline">Ẩn danh sách ca</span>
          </summary>
          <div className="ui-table-wrap mt-3">
            <table className="ui-table">
              <caption className="sr-only">Các ca được tính lương</caption>
              <thead>
                <tr>
                  <th scope="col">Ngày</th>
                  <th scope="col">Chi nhánh</th>
                  <th scope="col">Giờ</th>
                  <th scope="col">Thường</th>
                  <th scope="col">Tăng ca</th>
                  <th scope="col">Tiền</th>
                </tr>
              </thead>
              <tbody>
                {payslip.shifts.map((shift) => (
                  <tr key={shift.shiftId}>
                    <td>{formatDate(shift.workDate)}</td>
                    <td>{shift.branchName || "—"}</td>
                    <td className="whitespace-nowrap">
                      {formatTime(shift.checkInAt)} – {formatCheckOut({ workDate: shift.workDate, checkOutAt: shift.checkOutAt })}
                    </td>
                    <td>{formatHours(shift.regularMinutes)}</td>
                    <td>{shift.overtimeMinutes > 0 ? formatHours(shift.overtimeMinutes) : "—"}</td>
                    <td className="whitespace-nowrap">
                      {shift.employmentType === "part_time"
                        ? formatMoney(shift.regularPay + shift.overtimePay)
                        : shift.employmentType === "full_time"
                          ? EMPLOYMENT_TYPE_LABELS.full_time
                          : "Chưa có mức lương"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
