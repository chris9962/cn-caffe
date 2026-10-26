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
      .select("data")
      .eq("employee_id", employee.id)
      .eq("data->>month", month)
      .maybeSingle();
    if (error) return dbErrorResponse(error);
    const result: MyPay = { month, isEstimate: false, payslip: (data?.data as Payslip | undefined) ?? null };
    return Response.json(result);
  }

  const payslips = await computePayslips(supabase, month, employee.id);
  if (payslips instanceof Response) return payslips;
  const result: MyPay = { month, isEstimate: true, payslip: payslips[0] ?? null };
  return Response.json(result);
}
