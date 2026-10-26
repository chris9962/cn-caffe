import { requireEmployee } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { SHIFT_COLUMNS, type ShiftRow } from "@/app/api/_lib/mappers";
import { invalidBodyResponse, isCalendarDate, parseInstant, SHIFT_STATUSES } from "@/app/api/_lib/shift-input";
import { shiftResponse, withPhotoUrls } from "@/app/api/_lib/shifts";
import { currentMonth, monthRange } from "@/lib/date";

export async function GET(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  const params = new URL(request.url).searchParams;
  const range = monthRange(params.get("month") ?? currentMonth());
  if (!range) return errorResponse(400, "Tháng không hợp lệ.");

  const date = params.get("date");
  if (date !== null && !isCalendarDate(date)) return errorResponse(400, "Ngày không hợp lệ.");

  const branchId = params.get("branchId");
  const status = params.get("status");
  if ((branchId !== null && !isUuid(branchId)) || (status !== null && !SHIFT_STATUSES.has(status))) {
    return errorResponse(400, "Bộ lọc không hợp lệ.");
  }

  const base = supabase.from("shifts").select(SHIFT_COLUMNS, { count: "exact" });
  let query = date === null ? base.gte("work_date", range.from).lt("work_date", range.to) : base.eq("work_date", date);
  // Managers handle other people's shifts here; their own are never theirs to review.
  if (employee.role !== "admin" && employee.role !== "director") query = query.neq("employee_id", employee.id);
  if (branchId !== null) query = query.eq("branch_id", branchId);
  if (status !== null) query = query.eq("status", status);

  const { data, count, error } = await query
    .order("check_in_at", { ascending: false })
    .overrideTypes<ShiftRow[], { merge: false }>();
  if (error) return dbErrorResponse(error);

  return Response.json({ shifts: await withPhotoUrls(supabase, data), total: count ?? data.length });
}

export async function POST(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const body = await readJsonObject(request);
  if (!body) return invalidBodyResponse();
  const { employeeId, branchId } = body;
  if (typeof employeeId !== "string" || !isUuid(employeeId) || typeof branchId !== "string" || !isUuid(branchId)) {
    return invalidBodyResponse();
  }
  const checkInAt = parseInstant(body.checkInAt);
  if (checkInAt instanceof Response) return checkInAt;
  const checkOutAt = parseInstant(body.checkOutAt);
  if (checkOutAt instanceof Response) return checkOutAt;

  // Checked up front so a bad id returns 404 instead of surfacing as a foreign key error.
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, requires_attendance")
    .eq("id", employeeId)
    .eq("is_active", true)
    .maybeSingle();
  if (employeeError) return dbErrorResponse(employeeError);
  if (!employee) return errorResponse(404, "Không tìm thấy nhân viên.");
  if (!employee.requires_attendance) {
    return errorResponse(400, "Nhân viên này không cần chấm công.");
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("is_active", true)
    .maybeSingle();
  if (branchError) return dbErrorResponse(branchError);
  if (!branch) return errorResponse(404, "Không tìm thấy chi nhánh.");

  const { data, error } = await supabase.rpc("add_manual_shift", {
    p_employee_id: employeeId,
    p_branch_id: branchId,
    p_check_in_at: checkInAt,
    p_check_out_at: checkOutAt,
  });
  if (error) return dbErrorResponse(error);

  return shiftResponse(supabase, data.id, 201);
}
