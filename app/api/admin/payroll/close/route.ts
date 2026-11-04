import { requireAdmin } from "@/app/api/_lib/auth";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { computePayslips } from "@/app/api/_lib/payroll";
import { parseMonth } from "@/app/api/_lib/payroll-input";
import { removeShiftPhotos } from "@/app/api/_lib/shifts";

// Closing runs in two database steps around the calculation: start locks the month, finish stores the payslips.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  const monthDate = parseMonth(body.month);
  if (monthDate instanceof Response) return monthDate;
  const month = monthDate.slice(0, 7);

  const { error: startError } = await supabase.rpc("start_payroll_close", { p_month: monthDate });
  if (startError) return dbErrorResponse(startError);

  // Without this the month would stay locked after a failure, refusing every later shift edit.
  async function cancel(response: Response): Promise<Response> {
    const { error } = await supabase.rpc("cancel_payroll_close", { p_month: monthDate });
    if (error) console.error(error);
    return response;
  }

  const payslips = await computePayslips(supabase, month);
  if (payslips instanceof Response) return cancel(payslips);

  const { data: version, error: finishError } = await supabase.rpc("finish_payroll_close", {
    p_month: monthDate,
    p_payslips: payslips.map((payslip) => ({ employeeId: payslip.employeeId, total: payslip.totals.total, data: payslip })),
  });
  if (finishError) return cancel(dbErrorResponse(finishError));

  // The month is already closed here, so a failed photo cleanup is only logged and never undoes the close.
  const { data: photoPaths, error: photosError } = await supabase.rpc("clear_month_shift_photos", { p_month: monthDate });
  if (photosError) console.error(photosError);
  const deletedPhotos: string[] = photoPaths ?? [];
  await removeShiftPhotos(supabase, deletedPhotos);

  return Response.json({ month, version, deletedPhotos: deletedPhotos.length });
}
