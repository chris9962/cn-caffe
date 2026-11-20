import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse } from "@/app/api/_lib/errors";
import { computePayslips, loadPeriod } from "@/app/api/_lib/payroll";
import { parseMonth } from "@/app/api/_lib/payroll-input";
import { currentMonth } from "@/lib/date";
import type { MyPay, Payslip } from "@/types/payroll";

export async function GET(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  const month = new URL(request.url).searchParams.get("month") ?? currentMonth();
  const monthDate = parseMonth(month);
  if (monthDate instanceof Response) return monthDate;

  const period = await loadPeriod(supabase, monthDate);
  if (period instanceof Response) return period;

  if (period.status === "closed") {
    // RLS returns only the payslip of the latest version, so older versions never reach the employee.
    const { data, error } = await supabase
      .from("payslips")
      .select("version_id, data")
      .eq("employee_id", employee.id)
      .eq("data->>month", month);
    if (error) return dbErrorResponse(error);
    let row = data.at(0);
    // Payroll viewers read every version, and they may also read the table that tells which one is the latest.
    if (data.length > 1 && period.currentVersion !== null) {
      const { data: version, error: versionError } = await supabase
        .from("payroll_versions")
        .select("id")
        .eq("month", monthDate)
        .eq("version", period.currentVersion)
        .maybeSingle();
      if (versionError) return dbErrorResponse(versionError);
      row = data.find((payslip) => payslip.version_id === version?.id);
    }
    const result: MyPay = { month, isEstimate: false, payslip: (row?.data as Payslip | undefined) ?? null };
    return Response.json(result);
  }

  const payslips = await computePayslips(supabase, month, employee.id);
  if (payslips instanceof Response) return payslips;
  const result: MyPay = { month, isEstimate: true, payslip: payslips[0] ?? null };
  return Response.json(result);
}
