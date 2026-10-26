import { requireAdmin } from "@/app/api/_lib/auth";
import {
  duplicatePhoneResponse,
  isDuplicateAuthEmail,
  parseFullName,
  parseEmploymentType,
  parsePassword,
  parsePhone,
  parseRequiresAttendance,
  parseRole,
  readJsonObject,
} from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { EMPLOYEE_COLUMNS, toEmployee } from "@/app/api/_lib/mappers";
import { phoneToEmail } from "@/lib/auth/phone";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .order("full_name");
  if (error) return dbErrorResponse(error);

  return Response.json(data.map(toEmployee));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");

  const fullName = parseFullName(body.fullName);
  if (fullName instanceof Response) return fullName;
  const phone = parsePhone(body.phone);
  if (phone instanceof Response) return phone;
  const role = parseRole(body.role);
  if (role instanceof Response) return role;
  const password = parsePassword(body.password);
  if (password instanceof Response) return password;
  const employmentType = parseEmploymentType(body.employmentType ?? "part_time");
  if (employmentType instanceof Response) return employmentType;
  const attendanceAllowed = role !== "admin" && role !== "director";
  const requiresAttendance = parseRequiresAttendance(
    body.requiresAttendance ?? attendanceAllowed,
  );
  if (requiresAttendance instanceof Response) return requiresAttendance;
  if (!attendanceAllowed && requiresAttendance) {
    return errorResponse(400, "Admin và giám đốc không chấm công.");
  }

  const adminAuth = createAdminClient().auth.admin;
  const { data: created, error: createError } = await adminAuth.createUser({
    email: phoneToEmail(phone),
    password,
    email_confirm: true,
  });
  if (createError) {
    if (isDuplicateAuthEmail(createError)) return duplicatePhoneResponse();
    console.error(createError);
    return errorResponse(500, "Có lỗi xảy ra. Bạn thử lại sau.");
  }

  const { data: row, error } = await auth.supabase
    .from("employees")
    .insert({
      id: created.user.id,
      full_name: fullName,
      phone,
      role,
      employment_type: employmentType,
      requires_attendance: attendanceAllowed && requiresAttendance,
    })
    .select(EMPLOYEE_COLUMNS)
    .single();
  if (error) {
    // Without this the orphaned Auth user would keep the phone's email taken.
    const { error: deleteError } = await adminAuth.deleteUser(created.user.id);
    if (deleteError) console.error(deleteError);
    return error.code === "23505" ? duplicatePhoneResponse() : dbErrorResponse(error);
  }

  return Response.json(toEmployee(row), { status: 201 });
}
