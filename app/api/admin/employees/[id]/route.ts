import { requireAdmin } from "@/app/api/_lib/auth";
import {
  duplicatePhoneResponse,
  isDuplicateAuthEmail,
  isUuid,
  parseEndDate,
  parseEmploymentType,
  parseFullName,
  parsePhone,
  parseRole,
  parseRequiresAttendance,
  readJsonObject,
} from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { EMPLOYEE_COLUMNS, toEmployee } from "@/app/api/_lib/mappers";
import { phoneToEmail } from "@/lib/auth/phone";
import { createAdminClient } from "@/lib/supabase/admin";

const NOT_FOUND = "Không tìm thấy nhân viên.";
const SERVER_ERROR = "Có lỗi xảy ra. Bạn thử lại sau.";
const BAN_FOREVER = "876000h";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");

  const update: Record<string, unknown> = {};
  if ("fullName" in body) {
    const fullName = parseFullName(body.fullName);
    if (fullName instanceof Response) return fullName;
    update.full_name = fullName;
  }
  if ("phone" in body) {
    const phone = parsePhone(body.phone);
    if (phone instanceof Response) return phone;
    update.phone = phone;
  }
  if ("role" in body) {
    const role = parseRole(body.role);
    if (role instanceof Response) return role;
    update.role = role;
  }
  if ("endDate" in body) {
    const endDate = parseEndDate(body.endDate);
    if (endDate instanceof Response) return endDate;
    update.end_date = endDate;
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") return errorResponse(400, "Dữ liệu không hợp lệ.");
    update.is_active = body.isActive;
  }
  if ("employmentType" in body) {
    const employmentType = parseEmploymentType(body.employmentType);
    if (employmentType instanceof Response) return employmentType;
    update.employment_type = employmentType;
  }

  const { supabase } = auth;
  const { data: current, error: findError } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (findError) return dbErrorResponse(findError);
  if (!current) return errorResponse(404, NOT_FOUND);

  const nextRole = (update.role ?? current.role) as typeof current.role;
  if ("requiresAttendance" in body) {
    const requiresAttendance = parseRequiresAttendance(body.requiresAttendance);
    if (requiresAttendance instanceof Response) return requiresAttendance;
    if ((nextRole === "admin" || nextRole === "director") && requiresAttendance) {
      return errorResponse(400, "Admin và giám đốc không chấm công.");
    }
    update.requires_attendance = requiresAttendance;
  }
  if (nextRole === "admin" || nextRole === "director") {
    update.requires_attendance = false;
  }
  if (Object.keys(update).length === 0) return Response.json(toEmployee(current));

  const adminAuth = createAdminClient().auth.admin;
  const phoneChanged = typeof update.phone === "string" && update.phone !== current.phone;
  // Auth answers a taken email on update with an opaque 500, so the duplicate is detected here first.
  if (phoneChanged) {
    const { data: taken, error: takenError } = await supabase
      .from("employees")
      .select("id")
      .eq("phone", update.phone as string)
      .maybeSingle();
    if (takenError) return dbErrorResponse(takenError);
    if (taken) return duplicatePhoneResponse();


    const { error } = await adminAuth.updateUserById(id, {
      email: phoneToEmail(update.phone as string),
      email_confirm: true,
    });
    if (error) {
      if (isDuplicateAuthEmail(error)) return duplicatePhoneResponse();
      console.error(error);
      return errorResponse(500, SERVER_ERROR);
    }
  }

  const { data: row, error } = await supabase
    .from("employees")
    .update(update)
    .eq("id", id)
    .select(EMPLOYEE_COLUMNS)
    .single();
  if (error) {
    if (phoneChanged) {
      const { error: revertError } = await adminAuth.updateUserById(id, {
        email: phoneToEmail(current.phone),
        email_confirm: true,
      });
      if (revertError) console.error(revertError);
    }
    return error.code === "23505" ? duplicatePhoneResponse() : dbErrorResponse(error);
  }

  if (typeof update.is_active === "boolean") {
    const { error: banError } = await adminAuth.updateUserById(id, {
      ban_duration: update.is_active ? "none" : BAN_FOREVER,
    });
    if (banError) {
      console.error(banError);
      // A failed ban must not leave the row saying locked/unlocked while Auth says the opposite.
      const previous = Object.fromEntries(
        Object.keys(update).map((column) => [column, current[column as keyof typeof current]]),
      );
      const { error: restoreError } = await supabase.from("employees").update(previous).eq("id", id);
      if (restoreError) console.error(restoreError);
      if (phoneChanged) {
        const { error: revertError } = await adminAuth.updateUserById(id, {
          email: phoneToEmail(current.phone),
          email_confirm: true,
        });
        if (revertError) console.error(revertError);
      }
      return errorResponse(500, SERVER_ERROR);
    }
  }

  return Response.json(toEmployee(row));
}
