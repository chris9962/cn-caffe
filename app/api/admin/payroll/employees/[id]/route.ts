import { requirePayrollViewer } from "@/app/api/_lib/auth";
import { isUuid } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { computePayslips } from "@/app/api/_lib/payroll";
import { currentMonth } from "@/lib/date";
import type { EmployeePayHistory, PayHistoryMonth, Payslip } from "@/types/payroll";

const NOT_FOUND = "Không tìm thấy nhân viên.";

// One year of a person's pay: stored payslips for closed months, live estimates for open ones.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePayrollViewer();
  if ("response" in auth) return auth.response;
  const { supabase, canManage } = auth;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const thisMonth = currentMonth();
  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam === null ? Number(thisMonth.slice(0, 4)) : Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return errorResponse(400, "Năm không hợp lệ.");

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle();
  if (employeeError) return dbErrorResponse(employeeError);
  if (!employee) return errorResponse(404, NOT_FOUND);

  // Future months have nothing to pay yet.
  const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`).filter(
    (month) => month <= thisMonth,
  );

  const { data: periods, error: periodsError } = await supabase
    .from("payroll_periods")
    .select("month, current_version")
    .eq("status", "closed")
    .gte("month", `${year}-01-01`)
    .lt("month", `${year + 1}-01-01`);
  if (periodsError) return dbErrorResponse(periodsError);
  const closedVersion = new Map(periods.map((row) => [row.month.slice(0, 7), row.current_version as number]));

  const stored = new Map<string, Payslip>();
  if (closedVersion.size > 0) {
    const { data: versions, error: versionsError } = await supabase
      .from("payroll_versions")
      .select("id, month, version")
      .in("month", [...closedVersion.keys()].map((month) => `${month}-01`));
    if (versionsError) return dbErrorResponse(versionsError);
    const currentIds = versions
      .filter((row) => closedVersion.get(row.month.slice(0, 7)) === row.version)
      .map((row) => row.id);

    const { data: payslips, error: payslipsError } = await supabase
      .from("payslips")
      .select("data")
      .eq("employee_id", id)
      .in("version_id", currentIds);
    if (payslipsError) return dbErrorResponse(payslipsError);
    for (const row of payslips) {
      const payslip = row.data as Payslip;
      stored.set(payslip.month, payslip);
    }
  }

  const openMonths = months.filter((month) => !closedVersion.has(month));
  const estimates = await Promise.all(openMonths.map((month) => computePayslips(supabase, month, id)));
  const failed = estimates.find((result) => result instanceof Response);
  if (failed) return failed;

  // An open month where nothing happened (a part time rate but no shift) would only add a row of 0 đ.
  const estimateByMonth = new Map(
    openMonths.flatMap((month, index) => {
      const payslip = (estimates[index] as Payslip[])[0];
      const isEmpty =
        !payslip ||
        (payslip.shifts.length === 0 && payslip.fixedSegments.length === 0 && payslip.adjustments.length === 0);
      return isEmpty ? [] : [[month, payslip] as const];
    }),
  );
  const history: PayHistoryMonth[] = [];
  for (const month of [...months].reverse()) {
    const payslip = stored.get(month) ?? estimateByMonth.get(month);
    if (payslip) history.push({ month, version: closedVersion.get(month) ?? null, payslip });
  }

  const result: EmployeePayHistory = {
    employee: { id: employee.id, fullName: employee.full_name },
    canManage,
    year,
    months: history,
  };
  return Response.json(result);
}
