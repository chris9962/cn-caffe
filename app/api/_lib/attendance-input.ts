import { parseLatitude, parseLongitude } from "./branch-input";
import { errorResponse } from "./errors";

// Same limit as the shift-photos bucket, so a photo that passes here is never refused by Storage.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export type AttendanceFields = {
  photo: File;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
};

// Form values are text and Number("") is 0, so a blank or missing value becomes NaN and fails validation.
const formNumber = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;

export async function readMultipartForm(request: Request): Promise<FormData | Response> {
  const isMultipart = /^multipart\/form-data/i.test(request.headers.get("content-type") ?? "");
  const form = isMultipart ? await request.formData().catch(() => null) : null;
  return form ?? errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
}

export function parseAttendanceFields(form: FormData): AttendanceFields | Response {
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.type !== "image/jpeg" || photo.size < 1 || photo.size > MAX_PHOTO_BYTES) {
    return errorResponse(400, "Ảnh phải là ảnh JPEG chụp từ camera, tối đa 2 MB.");
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  if (form.has("latitude") || form.has("longitude")) {
    const parsedLatitude = parseLatitude(formNumber(form.get("latitude")));
    if (parsedLatitude instanceof Response) return parsedLatitude;
    const parsedLongitude = parseLongitude(formNumber(form.get("longitude")));
    if (parsedLongitude instanceof Response) return parsedLongitude;
    latitude = parsedLatitude;
    longitude = parsedLongitude;
  }

  let accuracyM: number | null = null;
  if (form.has("accuracyM")) {
    accuracyM = formNumber(form.get("accuracyM"));
    if (!Number.isFinite(accuracyM) || accuracyM < 0) return errorResponse(400, "Độ chính xác không hợp lệ.");
  }

  return { photo, latitude, longitude, accuracyM };
}
