import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { PAY_RATE_COLUMNS, toPayRate } from "@/app/api/_lib/mappers";
import { parseDate, parsePositiveAmount, parseRateEmploymentType } from "@/app/api/_lib/payroll-input";

const NOT_FOUND = "Không tìm thấy nhân viên.";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const { data, error } = await auth.supabase
    .from("pay_rates")
    .select(PAY_RATE_COLUMNS)
    .eq("employee_id", id)
    .order("effective_from", { ascending: false });
  if (error) return dbErrorResponse(error);

  return Response.json(data.map(toPayRate));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  const employmentType = parseRateEmploymentType(body.employmentType);
  if (employmentType instanceof Response) return employmentType;
  const amount = parsePositiveAmount(body.amount, "Mức lương phải là số nguyên lớn hơn 0.");
  if (amount instanceof Response) return amount;
  const effectiveFrom = parseDate(body.effectiveFrom, "Ngày bắt đầu hiệu lực không hợp lệ.");
  if (effectiveFrom instanceof Response) return effectiveFrom;

  const { data, error } = await auth.supabase
    .from("pay_rates")
    .insert({ employee_id: id, employment_type: employmentType, amount, effective_from: effectiveFrom })
    .select(PAY_RATE_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") return errorResponse(409, "Nhân viên đã có một mức lương bắt đầu từ ngày này.");
    if (error.code === "23503") return errorResponse(404, NOT_FOUND);
    return dbErrorResponse(error);
  }

  return Response.json(toPayRate(data), { status: 201 });
}
