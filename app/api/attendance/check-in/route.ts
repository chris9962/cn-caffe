import { parseAttendanceFields, readMultipartForm } from "@/app/api/_lib/attendance-input";
import { requireEmployee } from "@/app/api/_lib/auth";
import { isUuid } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { SHIFT_COLUMNS, type ShiftRow } from "@/app/api/_lib/mappers";
import { findOpenShift, removeShiftPhoto, uploadShiftPhoto, withPhotoUrls } from "@/app/api/_lib/shifts";

export async function POST(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  const form = await readMultipartForm(request);
  if (form instanceof Response) return form;
  const fields = parseAttendanceFields(form);
  if (fields instanceof Response) return fields;
  const branchId = form.get("branchId");
  if (typeof branchId !== "string" || !isUuid(branchId)) return errorResponse(400, "Chi nhánh không hợp lệ.");

  const photoPath = await uploadShiftPhoto(supabase, employee.id, fields.photo);
  if (photoPath instanceof Response) return photoPath;

  const { data, error } = await supabase
    .rpc("check_in", {
      p_branch_id: branchId,
      p_latitude: fields.latitude,
      p_longitude: fields.longitude,
      p_accuracy_m: fields.accuracyM,
      p_photo_path: photoPath,
      p_start_new: form.get("startNew") === "true",
    })
    .select(SHIFT_COLUMNS)
    .single()
    .overrideTypes<ShiftRow, { merge: false }>();
  if (error) {
    await removeShiftPhoto(supabase, photoPath);
    if (error.message !== "open_shift_exists") return dbErrorResponse(error);

    // The client needs the open shift to offer checking it out or starting a new one.
    const open = await findOpenShift(supabase, employee.id);
    if ("response" in open) return open.response;
    const conflict = await dbErrorResponse(error).json();
    return Response.json({ ...conflict, openShift: open.shift }, { status: 409 });
  }

  const [shift] = await withPhotoUrls(supabase, [data]);
  return Response.json(shift, { status: 201 });
}
