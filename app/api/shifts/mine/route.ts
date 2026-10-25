import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { SHIFT_COLUMNS, type ShiftRow } from "@/app/api/_lib/mappers";
import { withPhotoUrls } from "@/app/api/_lib/shifts";
import { currentMonth, monthRange } from "@/lib/date";

export async function GET(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  const range = monthRange(new URL(request.url).searchParams.get("month") ?? currentMonth());
  if (!range) return errorResponse(400, "Tháng không hợp lệ.");

  // Managers can read other employees' shifts, so filter to the caller explicitly.
  const { data, error } = await supabase
    .from("shifts")
    .select(SHIFT_COLUMNS)
    .eq("employee_id", employee.id)
    .gte("work_date", range.from)
    .lt("work_date", range.to)
    .order("check_in_at", { ascending: false })
    .overrideTypes<ShiftRow[], { merge: false }>();
  if (error) return dbErrorResponse(error);

  return Response.json(await withPhotoUrls(supabase, data));
}
