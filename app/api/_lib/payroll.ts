import { monthRange } from "@/lib/date";
import { calculatePayslip, needsPayslip, type PayrollInput, type RateInput, type ShiftInput } from "@/lib/payroll/calculate";
import type { EmploymentType } from "@/types/employee";
import type { MonthlyConfig, Payslip, PayrollStatus } from "@/types/payroll";
import type { ServerClient } from "./auth";
import { dbErrorResponse } from "./errors";

const PAGE_SIZE = 1000;

type ConfigRow = {
  month: string;
  overtime_start: string;
  overtime_end: string;
  overtime_hourly_rate: number;
  max_shift_minutes: number;
};

// Postgres prints a time as "23:00:00"; the app works in "HH:MM".
export function toMonthlyConfig(row: ConfigRow, isLocked: boolean): MonthlyConfig {
  return {
    month: row.month.slice(0, 7),
    overtimeStart: row.overtime_start.slice(0, 5),
    overtimeEnd: row.overtime_end.slice(0, 5),
    overtimeHourlyRate: row.overtime_hourly_rate,
    maxShiftMinutes: row.max_shift_minutes,
    isLocked,
  };
}

export async function loadMonthlyConfig(supabase: ServerClient, monthDate: string): Promise<ConfigRow | Response> {
  const { data, error } = await supabase.rpc("get_monthly_config", { p_month: monthDate });
  if (error) return dbErrorResponse(error);
  return data as ConfigRow;
}

export async function loadPeriod(
  supabase: ServerClient,
  monthDate: string,
): Promise<{ status: PayrollStatus; currentVersion: number | null } | Response> {
  const { data, error } = await supabase
    .from("payroll_periods")
    .select("status, current_version")
    .eq("month", monthDate)
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  return { status: data?.status ?? "open", currentVersion: data?.current_version ?? null };
}

type ShiftRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  work_date: string;
  check_in_at: string;
  check_out_at: string;
  branches: { name: string } | null;
};

// A month can hold more shifts than one PostgREST page, so this reads page by page.
async function loadValidShifts(
  supabase: ServerClient,
  range: { from: string; to: string },
  employeeId: string | null,
): Promise<ShiftRow[] | Response> {
  const rows: ShiftRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from("shifts")
      .select("id, employee_id, branch_id, work_date, check_in_at, check_out_at, branches(name)")
      .eq("status", "valid")
      .gte("work_date", range.from)
      .lt("work_date", range.to);
    if (employeeId) query = query.eq("employee_id", employeeId);
    const { data, error } = await query
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
      .overrideTypes<ShiftRow[], { merge: false }>();
    if (error) return dbErrorResponse(error);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

// Reads everything one month's pay depends on and runs the same calculation for estimates and for closing.
// employeeId limits it to one person, which is what "Lương của tôi" needs.
export async function computePayslips(
  supabase: ServerClient,
  month: string,
  employeeId: string | null = null,
): Promise<Payslip[] | Response> {
  const range = monthRange(month);
  if (!range) throw new Error(`Invalid month: ${month}`);

  const config = await loadMonthlyConfig(supabase, range.from);
  if (config instanceof Response) return config;

  let employeesQuery = supabase.from("employees").select("id, full_name, phone, end_date");
  let ratesQuery = supabase.from("pay_rates").select("employee_id, employment_type, amount, effective_from");
  let adjustmentsQuery = supabase
    .from("pay_adjustments")
    .select("id, employee_id, amount, note")
    .eq("month", range.from)
    .order("created_at");
  if (employeeId) {
    employeesQuery = employeesQuery.eq("id", employeeId);
    ratesQuery = ratesQuery.eq("employee_id", employeeId);
    adjustmentsQuery = adjustmentsQuery.eq("employee_id", employeeId);
  }

  const [employees, rates, adjustments, shifts] = await Promise.all([
    employeesQuery,
    ratesQuery,
    adjustmentsQuery,
    loadValidShifts(supabase, range, employeeId),
  ]);
  if (employees.error) return dbErrorResponse(employees.error);
  if (rates.error) return dbErrorResponse(rates.error);
  if (adjustments.error) return dbErrorResponse(adjustments.error);
  if (shifts instanceof Response) return shifts;

  const ratesByEmployee = groupBy(rates.data, (row) => row.employee_id);
  const adjustmentsByEmployee = groupBy(adjustments.data, (row) => row.employee_id);
  const shiftsByEmployee = groupBy(shifts, (row) => row.employee_id);

  const payslips: Payslip[] = [];
  for (const employee of employees.data) {
    const input: PayrollInput = {
      month,
      employee: { id: employee.id, fullName: employee.full_name, phone: employee.phone, endDate: employee.end_date },
      rates: (ratesByEmployee.get(employee.id) ?? []).map(
        (row): RateInput => ({
          employmentType: row.employment_type as EmploymentType,
          amount: row.amount,
          effectiveFrom: row.effective_from,
        }),
      ),
      config: {
        overtimeStart: config.overtime_start.slice(0, 5),
        overtimeEnd: config.overtime_end.slice(0, 5),
        overtimeHourlyRate: config.overtime_hourly_rate,
      },
      shifts: (shiftsByEmployee.get(employee.id) ?? []).map(
        (row): ShiftInput => ({
          id: row.id,
          branchId: row.branch_id,
          // RLS hides inactive branches from staff, so the embed is null for a branch closed later.
          branchName: row.branches?.name ?? "",
          workDate: row.work_date,
          checkInAt: row.check_in_at,
          checkOutAt: row.check_out_at,
        }),
      ),
      adjustments: (adjustmentsByEmployee.get(employee.id) ?? []).map((row) => ({
        id: row.id,
        amount: row.amount,
        note: row.note,
      })),
    };
    if (needsPayslip(input)) payslips.push(calculatePayslip(input));
  }

  return payslips.sort((a, b) => a.employeeName.localeCompare(b.employeeName, "vi"));
}

export async function loadStoredPayslips(
  supabase: ServerClient,
  monthDate: string,
  version: number,
  employeeId: string | null = null,
): Promise<Payslip[] | Response> {
  const { data: versionRow, error: versionError } = await supabase
    .from("payroll_versions")
    .select("id")
    .eq("month", monthDate)
    .eq("version", version)
    .maybeSingle();
  if (versionError) return dbErrorResponse(versionError);
  if (!versionRow) return [];

  let query = supabase.from("payslips").select("data").eq("version_id", versionRow.id);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) return dbErrorResponse(error);

  return data
    .map((row) => row.data as Payslip)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "vi"));
}
