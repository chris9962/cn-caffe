import { formatDate, formatTime } from "@/lib/date";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/employees/labels";
import { formatHours, formatMoney, formatSignedMoney } from "@/lib/payroll/format";
import { formatCheckOut } from "@/lib/shifts/labels";
import type { Payslip, PayslipShift } from "@/types/payroll";

type RateGroup = { rate: number; minutes: number; pay: number; firstDate: string; lastDate: string };

// One line per hourly rate, so a raise in the middle of the month shows both rates and their hours.
function groupByHourlyRate(shifts: PayslipShift[]): RateGroup[] {
  const groups = new Map<number, RateGroup>();
  for (const shift of shifts) {
    if (shift.hourlyRate === null) continue;
    const group = groups.get(shift.hourlyRate) ?? {
      rate: shift.hourlyRate,
      minutes: 0,
      pay: 0,
      firstDate: shift.workDate,
      lastDate: shift.workDate,
    };
    group.minutes += shift.regularMinutes;
    group.pay += shift.regularPay;
    if (shift.workDate < group.firstDate) group.firstDate = shift.workDate;
    if (shift.workDate > group.lastDate) group.lastDate = shift.workDate;
    groups.set(shift.hourlyRate, group);
  }
  return [...groups.values()].sort((a, b) => a.firstDate.localeCompare(b.firstDate));
}

const shortDate = (date: string) => formatDate(date).slice(0, 5);

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
  const rateGroups = groupByHourlyRate(payslip.shifts);
  const unpaidShifts = payslip.shifts.filter((shift) => shift.employmentType === null).length;

  return (
    <div className="flex flex-col gap-5">
      <dl className="divide-y divide-[var(--line)] text-sm">
        {hasPartTime && (
          <>
            {rateGroups.map((group) => (
              <SummaryRow
                key={group.rate}
                label={`Giờ thường · ${formatMoney(group.rate)}/giờ`}
                hint={`${formatHours(group.minutes)} · ca ${
                  group.firstDate === group.lastDate
                    ? shortDate(group.firstDate)
                    : `${shortDate(group.firstDate)} – ${shortDate(group.lastDate)}`
                }`}
                value={formatMoney(group.pay)}
              />
            ))}
            {totals.overtimeMinutes > 0 && (
              <SummaryRow
                label={`Giờ tăng ca · ${formatMoney(config.overtimeHourlyRate)}/giờ`}
                hint={`${formatHours(totals.overtimeMinutes)} · khung ${config.overtimeStart} – ${config.overtimeEnd}`}
                value={formatMoney(totals.overtimePay)}
              />
            )}
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
          <ul aria-label="Các ca được tính lương" className="mt-3 flex flex-col divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
            {payslip.shifts.map((shift) => (
              <li key={shift.shiftId} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{formatDate(shift.workDate)}</p>
                  <p className="ui-hint">
                    {formatTime(shift.checkInAt)} – {formatCheckOut({ workDate: shift.workDate, checkOutAt: shift.checkOutAt })}
                    {shift.branchName ? ` · ${shift.branchName}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold whitespace-nowrap">
                    {shift.employmentType === "part_time"
                      ? formatMoney(shift.regularPay + shift.overtimePay)
                      : shift.employmentType === "full_time"
                        ? EMPLOYMENT_TYPE_LABELS.full_time
                        : "Chưa có mức lương"}
                  </p>
                  <p className="ui-hint whitespace-nowrap">
                    {formatHours(shift.regularMinutes)}
                    {shift.hourlyRate !== null && ` × ${formatMoney(shift.hourlyRate)}`}
                  </p>
                  {shift.overtimeMinutes > 0 && (
                    <p className="ui-hint whitespace-nowrap">+ {formatHours(shift.overtimeMinutes)} tăng ca</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
