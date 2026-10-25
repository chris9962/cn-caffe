import { parseAttendanceFields, readMultipartForm } from "@/app/api/_lib/attendance-input";
import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse } from "@/app/api/_lib/errors";
import { SHIFT_COLUMNS, type ShiftRow } from "@/app/api/_lib/mappers";
import { removeShiftPhoto, uploadShiftPhoto, withPhotoUrls } from "@/app/api/_lib/shifts";

export async function POST(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  const form = await readMultipartForm(request);
  if (form instanceof Response) return form;
  const fields = parseAttendanceFields(form);
  if (fields instanceof Response) return fields;

  const photoPath = await uploadShiftPhoto(supabase, employee.id, fields.photo);
  if (photoPath instanceof Response) return photoPath;

  const { data, error } = await supabase
    .rpc("check_out", {
      p_latitude: fields.latitude,
      p_longitude: fields.longitude,
      p_accuracy_m: fields.accuracyM,
      p_photo_path: photoPath,
    })
    .select(SHIFT_COLUMNS)
    .single()
    .overrideTypes<ShiftRow, { merge: false }>();
  if (error) {
    await removeShiftPhoto(supabase, photoPath);
    return dbErrorResponse(error);
  }

  const [shift] = await withPhotoUrls(supabase, [data]);
  return Response.json(shift);
}
