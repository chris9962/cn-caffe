import { monthRange, toVietnamLocalInput } from "@/lib/date";
import type { EmploymentType } from "@/types/employee";
import type { Payslip, PayslipBranchHours, PayslipFixedSegment, PayslipShift } from "@/types/payroll";

export type RateInput = { employmentType: EmploymentType; amount: number; effectiveFrom: string };

// Only valid shifts belong here; every other status earns nothing.
export type ShiftInput = {
  id: string;
  branchId: string;
  branchName: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string;
};

export type PayrollInput = {
  month: string;
  employee: { id: string; fullName: string; phone: string; endDate: string | null };
  rates: RateInput[];
  config: { overtimeStart: string; overtimeEnd: string; overtimeHourlyRate: number };
  shifts: ShiftInput[];
  adjustments: Array<{ id: string; amount: number; note: string }>;
};

const MINUTE_MS = 60_000;

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function daysOfMonth(month: string): string[] {
  const range = monthRange(month);
  if (!range) throw new Error(`Invalid month: ${month}`);
  const days: string[] = [];
  for (let day = range.from; day < range.to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Every rate stops after the end date, so a departed employee earns nothing for later days.
export function rateOn(rates: RateInput[], endDate: string | null, date: string): RateInput | null {
  if (endDate !== null && date > endDate) return null;
  let match: RateInput | null = null;
  for (const rate of rates) {
    if (rate.effectiveFrom <= date && (match === null || rate.effectiveFrom > match.effectiveFrom)) match = rate;
  }
  return match;
}

// Vietnam has no daylight saving time, so a wall-clock time is always +07:00.
const vietnamInstant = (date: string, time: string) => Date.parse(`${date}T${time}:00+07:00`);

// Counts the minutes of [checkIn, checkOut) that fall inside any overtime window, for example 23:00–06:00.
export function overtimeMinutes(checkInAt: string, checkOutAt: string, start: string, end: string): number {
  if (start === end) return 0;
  const from = Date.parse(checkInAt);
  const to = Date.parse(checkOutAt);
  const crossesMidnight = start > end;
  // A window that started the evening before can still cover the check in.
  const firstDay = addDays(toVietnamLocalInput(checkInAt).slice(0, 10), -1);
  const lastDay = toVietnamLocalInput(checkOutAt).slice(0, 10);

  let overlapMs = 0;
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    const windowStart = vietnamInstant(day, start);
    const windowEnd = vietnamInstant(crossesMidnight ? addDays(day, 1) : day, end);
    overlapMs += Math.max(0, Math.min(to, windowEnd) - Math.max(from, windowStart));
  }
  return Math.floor(overlapMs / MINUTE_MS);
}

function payShift(shift: ShiftInput, input: PayrollInput): PayslipShift {
  const rate = rateOn(input.rates, input.employee.endDate, shift.workDate);
  const totalMinutes = Math.floor((Date.parse(shift.checkOutAt) - Date.parse(shift.checkInAt)) / MINUTE_MS);
  const base = {
    shiftId: shift.id,
    workDate: shift.workDate,
    branchName: shift.branchName,
    checkInAt: shift.checkInAt,
    checkOutAt: shift.checkOutAt,
    employmentType: rate?.employmentType ?? null,
  };

  // Full time hours are only tracked; the fixed monthly amount pays for them.
  if (rate?.employmentType !== "part_time") {
    return { ...base, hourlyRate: null, regularMinutes: totalMinutes, overtimeMinutes: 0, regularPay: 0, overtimePay: 0 };
  }

  const overtime = Math.min(
    totalMinutes,
    overtimeMinutes(shift.checkInAt, shift.checkOutAt, input.config.overtimeStart, input.config.overtimeEnd),
  );
  const regular = totalMinutes - overtime;
  // Overtime minutes earn the overtime rate instead of, not on top of, the hourly rate.
  return {
    ...base,
    hourlyRate: rate.amount,
    regularMinutes: regular,
    overtimeMinutes: overtime,
    regularPay: Math.round((regular * rate.amount) / 60),
    overtimePay: Math.round((overtime * input.config.overtimeHourlyRate) / 60),
  };
}

// Splits the month into runs of days under the same full time rate, each paid by calendar days.
function fixedSegments(input: PayrollInput, days: string[]): PayslipFixedSegment[] {
  const segments: Array<PayslipFixedSegment & { rate: RateInput }> = [];
  for (const day of days) {
    const rate = rateOn(input.rates, input.employee.endDate, day);
    if (rate?.employmentType !== "full_time") continue;
    const last = segments.at(-1);
    if (last && last.rate === rate && addDays(last.to, 1) === day) {
      last.to = day;
      last.days += 1;
    } else {
      segments.push({ rate, from: day, to: day, days: 1, monthlyAmount: rate.amount, pay: 0 });
    }
  }
  return segments.map(({ rate, ...segment }) => ({
    ...segment,
    pay: Math.round((rate.amount * segment.days) / days.length),
  }));
}

function branchHours(shifts: ShiftInput[]): PayslipBranchHours[] {
  const byBranch = new Map<string, PayslipBranchHours>();
  for (const shift of shifts) {
    const minutes = Math.floor((Date.parse(shift.checkOutAt) - Date.parse(shift.checkInAt)) / MINUTE_MS);
    const entry = byBranch.get(shift.branchId) ?? { branchId: shift.branchId, branchName: shift.branchName, minutes: 0 };
    entry.minutes += minutes;
    byBranch.set(shift.branchId, entry);
  }
  return [...byBranch.values()].sort((a, b) => a.branchName.localeCompare(b.branchName, "vi"));
}

export function calculatePayslip(input: PayrollInput): Payslip {
  const days = daysOfMonth(input.month);
  const shifts = [...input.shifts]
    .sort((a, b) => a.checkInAt.localeCompare(b.checkInAt))
    .map((shift) => payShift(shift, input));
  const segments = fixedSegments(input, days);

  const employmentTypes = new Set<EmploymentType>();
  for (const day of days) {
    const rate = rateOn(input.rates, input.employee.endDate, day);
    if (rate) employmentTypes.add(rate.employmentType);
  }

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const regularPay = sum(shifts.map((shift) => shift.regularPay));
  const overtimePay = sum(shifts.map((shift) => shift.overtimePay));
  const fixedPay = sum(segments.map((segment) => segment.pay));
  const additions = sum(input.adjustments.filter((item) => item.amount > 0).map((item) => item.amount));
  const deductions = sum(input.adjustments.filter((item) => item.amount < 0).map((item) => item.amount));

  return {
    month: input.month,
    employeeId: input.employee.id,
    employeeName: input.employee.fullName,
    phone: input.employee.phone,
    employmentTypes: [...employmentTypes],
    config: input.config,
    shifts,
    fixedSegments: segments,
    branches: branchHours(input.shifts),
    adjustments: input.adjustments,
    totals: {
      regularMinutes: sum(shifts.map((shift) => shift.regularMinutes)),
      overtimeMinutes: sum(shifts.map((shift) => shift.overtimeMinutes)),
      regularPay,
      overtimePay,
      fixedPay,
      additions,
      deductions,
      total: regularPay + overtimePay + fixedPay + additions + deductions,
    },
  };
}

// A payslip is due when any day of the month is under a pay rate, or there is a valid shift or an adjustment.
export function needsPayslip(input: PayrollInput): boolean {
  if (input.shifts.length > 0 || input.adjustments.length > 0) return true;
  return daysOfMonth(input.month).some((day) => rateOn(input.rates, input.employee.endDate, day) !== null);
}
