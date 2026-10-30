import { loadCurrentUser } from "@/app/api/_lib/current-user";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { EMPLOYEE_COLUMNS, toEmployee } from "@/app/api/_lib/mappers";
import { normalizePhone, phoneToEmail } from "@/lib/auth/phone";
import { homePath } from "@/lib/employees/home";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { phone, password } = await request.json().catch(() => ({}));
  const normalizedPhone = typeof phone === "string" ? normalizePhone(phone) : null;
  if (!normalizedPhone) return errorResponse(400, "Số điện thoại không hợp lệ.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(normalizedPhone),
    password,
  });
  if (error) {
    // Wrong password and banned (locked) users both land here; the log tells them apart from an Auth outage.
    console.error(error);
    return errorResponse(401, "Số điện thoại hoặc mật khẩu không đúng.");
  }

  const { data: row, error: rowError } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", data.user.id)
    .maybeSingle();
  if (rowError) return dbErrorResponse(rowError);
  // Without an active row every page reports the session problem, so any start page will do.
  if (!row?.is_active) return Response.json({ home: "/check-in" });

  const currentUser = await loadCurrentUser(supabase, toEmployee(row));
  if (currentUser instanceof Response) return currentUser;
  return Response.json({ home: homePath(currentUser) });
}
