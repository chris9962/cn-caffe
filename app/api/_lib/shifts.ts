import type { Shift } from "@/types/shift";
import type { ServerClient } from "./auth";
import { dbErrorResponse, errorResponse } from "./errors";
import { SHIFT_COLUMNS, type ShiftRow, toShift } from "./mappers";

const PHOTO_BUCKET = "shift-photos";
const SIGNED_URL_SECONDS = 300;

// The server picks the object name, so a client can never point a shift at another file.
export async function uploadShiftPhoto(supabase: ServerClient, employeeId: string, photo: File): Promise<string | Response> {
  const path = `${employeeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (error) {
    console.error(error);
    return errorResponse(500, "Có lỗi xảy ra. Bạn thử lại sau.");
  }
  return path;
}

export async function removeShiftPhoto(supabase: ServerClient, path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  // Storage reports an object that RLS kept as an empty result, not as an error.
  if (error || data.length === 0) console.error(error ?? `Shift photo was not removed: ${path}`);
}

export async function withPhotoUrls(supabase: ServerClient, rows: ShiftRow[]): Promise<Shift[]> {
  const paths = rows
    .flatMap((row) => [row.check_in_photo_path, row.check_out_photo_path])
    .filter((path): path is string => path !== null);

  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    // A missing photo must not hide the shift, so signing failures only leave the URL null.
    if (error) console.error(error);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  const urlOf = (path: string | null) => (path === null ? null : (urls.get(path) ?? null));
  return rows.map((row) =>
    toShift(row, { checkIn: urlOf(row.check_in_photo_path), checkOut: urlOf(row.check_out_photo_path) }),
  );
}

// Managers can read other employees' shifts, so the lookup filters to the caller explicitly.
export async function findOpenShift(
  supabase: ServerClient,
  employeeId: string,
): Promise<{ shift: Shift | null } | { response: Response }> {
  const { data, error } = await supabase
    .from("shifts")
    .select(SHIFT_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("status", "open")
    .maybeSingle()
    .overrideTypes<ShiftRow, { merge: false }>();
  if (error) return { response: dbErrorResponse(error) };
  if (!data) return { shift: null };

  const [shift] = await withPhotoUrls(supabase, [data]);
  return { shift };
}

export async function findShiftById(supabase: ServerClient, id: string): Promise<Shift | null | Response> {
  const { data, error } = await supabase
    .from("shifts")
    .select(SHIFT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<ShiftRow, { merge: false }>();
  if (error) return dbErrorResponse(error);
  if (!data) return null;

  const [shift] = await withPhotoUrls(supabase, [data]);
  return shift;
}

// The rpc returns a bare row, so the response re-reads the shift to get branch and employee names.
export async function shiftResponse(supabase: ServerClient, id: string, status = 200): Promise<Response> {
  const shift = await findShiftById(supabase, id);
  if (shift instanceof Response) return shift;
  if (!shift) return errorResponse(404, "Không tìm thấy ca.");
  return Response.json(shift, { status });
}
