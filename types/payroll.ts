import type { EmploymentType } from "@/types/employee";
import type { ShiftStatus } from "@/types/shift";

export type PayRate = {
  id: string;
  employmentType: EmploymentType;
  amount: number;
  effectiveFrom: string;
};

export type PayAdjustment = {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type MonthlyConfig = {
  month: string;
  overtimeStart: string;
  overtimeEnd: string;
  overtimeHourlyRate: number;
  maxShiftMinutes: number;
  isLocked: boolean;
};

export type PayslipShift = {
  shiftId: string;
  workDate: string;
  branchName: string;
  checkInAt: string;
  checkOutAt: string;
  employmentType: EmploymentType | null;
  hourlyRate: number | null;
  regularMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
};

export type PayslipFixedSegment = {
  from: string;
  to: string;
  days: number;
  monthlyAmount: number;
  pay: number;
};

export type PayslipBranchHours = { branchId: string; branchName: string; minutes: number };

export type PayslipTotals = {
  regularMinutes: number;
  overtimeMinutes: number;
  regularPay: number;
  overtimePay: number;
  fixedPay: number;
  additions: number;
  deductions: number;
  total: number;
};

export type Payslip = {
  month: string;
  employeeId: string;
  employeeName: string;
  phone: string;
  employmentTypes: EmploymentType[];
  config: { overtimeStart: string; overtimeEnd: string; overtimeHourlyRate: number };
  shifts: PayslipShift[];
  fixedSegments: PayslipFixedSegment[];
  branches: PayslipBranchHours[];
  adjustments: Array<{ id: string; amount: number; note: string }>;
  totals: PayslipTotals;
};

export type PayrollStatus = "open" | "closing" | "closed";

export type PayrollVersion = {
  version: number;
  closedAt: string;
  closedByName: string | null;
  reopenedAt: string | null;
  reopenedByName: string | null;
  reopenReason: string | null;
};

export type BlockingShift = { id: string; employeeName: string; workDate: string; status: ShiftStatus };

export type PayrollMonth = {
  month: string;
  status: PayrollStatus;
  hasEnded: boolean;
  versions: PayrollVersion[];
  // The version whose payslips are shown, or null when the payslips are a live estimate.
  shownVersion: number | null;
  blockingShifts: BlockingShift[];
  payslips: Payslip[];
};

export type MyPay = { month: string; isEstimate: boolean; payslip: Payslip | null };
