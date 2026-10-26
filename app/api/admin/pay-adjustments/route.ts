import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { PAY_ADJUSTMENT_COLUMNS, type PayAdjustmentRow, toPayAdjustment } from "@/app/api/_lib/mappers";
import { parseMonth, parseNote, parseSignedAmount } from "@/app/api/_lib/payroll-input";
import { currentMonth } from "@/lib/date";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const monthDate = parseMonth(new URL(request.url).searchParams.get("month") ?? currentMonth());
  if (monthDate instanceof Response) return monthDate;

  const { data, error } = await auth.supabase
    .from("pay_adjustments")
    .select(PAY_ADJUSTMENT_COLUMNS)
    .eq("month", monthDate)
    .order("created_at")
    .overrideTypes<PayAdjustmentRow[], { merge: false }>();
  if (error) return dbErrorResponse(error);

  return Response.json(data.map(toPayAdjustment));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  if (typeof body.employeeId !== "string" || !isUuid(body.employeeId)) {
    return errorResponse(400, "Bạn chọn nhân viên.");
  }
  const monthDate = parseMonth(body.month);
  if (monthDate instanceof Response) return monthDate;
  const amount = parseSignedAmount(body.amount);
  if (amount instanceof Response) return amount;
  const note = parseNote(body.note);
  if (note instanceof Response) return note;

  const { data, error } = await auth.supabase
    .from("pay_adjustments")
    .insert({ employee_id: body.employeeId, month: monthDate, amount, note })
    .select(PAY_ADJUSTMENT_COLUMNS)
    .single()
    .overrideTypes<PayAdjustmentRow, { merge: false }>();
  if (error) {
    if (error.code === "23503") return errorResponse(404, "Không tìm thấy nhân viên.");
    return dbErrorResponse(error);
  }

  return Response.json(toPayAdjustment(data), { status: 201 });
}
