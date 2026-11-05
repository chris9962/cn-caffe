import { monthRange, toVietnamLocalInput } from "@/lib/date";
import type { EmploymentType } from "@/types/employee";
import type { Payslip, PayslipBranchHours, PayslipConfig, PayslipShift } from "@/types/payroll";

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
  config: PayslipConfig;
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

// Walks the shifts in check in order, because a full time day fills its required hours with the earliest shifts first.
function payShifts(shifts: ShiftInput[], input: PayrollInput): PayslipShift[] {
  const { config } = input;
  const fullTimeMinutesByDay = new Map<string, number>();

  return shifts.map((shift) => {
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

    if (rate === null) {
      return { ...base, hourlyRate: null, regularMinutes: totalMinutes, overtimeMinutes: 0, regularPay: 0, overtimePay: 0 };
    }

    let overtime: number;
    let overtimeRate: number;
    if (rate.employmentType === "part_time") {
      overtime = Math.min(totalMinutes, overtimeMinutes(shift.checkInAt, shift.checkOutAt, config.overtimeStart, config.overtimeEnd));
      overtimeRate = config.overtimeHourlyRate;
    } else {
      // Full time overtime is whatever the day's shifts add up to beyond the required hours, at any time of day.
      const workedBefore = fullTimeMinutesByDay.get(shift.workDate) ?? 0;
      fullTimeMinutesByDay.set(shift.workDate, workedBefore + totalMinutes);
      overtime = totalMinutes - Math.min(totalMinutes, Math.max(0, config.fullTimeDailyMinutes - workedBefore));
      overtimeRate = config.fullTimeOvertimeHourlyRate;
    }

    const regular = totalMinutes - overtime;
    // Overtime minutes earn the overtime rate instead of, not on top of, the hourly rate.
    return {
      ...base,
      hourlyRate: rate.amount,
      regularMinutes: regular,
      overtimeMinutes: overtime,
      regularPay: Math.round((regular * rate.amount) / 60),
      overtimePay: Math.round((overtime * overtimeRate) / 60),
    };
  });
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
  const shifts = payShifts(
    [...input.shifts].sort((a, b) => a.checkInAt.localeCompare(b.checkInAt)),
    input,
  );

  const employmentTypes = new Set<EmploymentType>();
  for (const day of days) {
    const rate = rateOn(input.rates, input.employee.endDate, day);
    if (rate) employmentTypes.add(rate.employmentType);
  }

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const regularPay = sum(shifts.map((shift) => shift.regularPay));
  const overtimePay = sum(shifts.map((shift) => shift.overtimePay));
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
    branches: branchHours(input.shifts),
    adjustments: input.adjustments,
    totals: {
      regularMinutes: sum(shifts.map((shift) => shift.regularMinutes)),
      overtimeMinutes: sum(shifts.map((shift) => shift.overtimeMinutes)),
      regularPay,
      overtimePay,
      additions,
      deductions,
      total: regularPay + overtimePay + additions + deductions,
    },
  };
}

// A payslip is due when any day of the month is under a pay rate, or there is a valid shift or an adjustment.
export function needsPayslip(input: PayrollInput): boolean {
  if (input.shifts.length > 0 || input.adjustments.length > 0) return true;
  return daysOfMonth(input.month).some((day) => rateOn(input.rates, input.employee.endDate, day) !== null);
}
