import { requireAdmin } from "@/app/api/_lib/auth";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { parseMonth } from "@/app/api/_lib/payroll-input";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  const monthDate = parseMonth(body.month);
  if (monthDate instanceof Response) return monthDate;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return errorResponse(400, "Bạn cần nhập lý do mở lại tháng.");

  const { error } = await auth.supabase.rpc("reopen_payroll_month", { p_month: monthDate, p_reason: reason });
  if (error) return dbErrorResponse(error);

  return Response.json({ month: monthDate.slice(0, 7) });
}
