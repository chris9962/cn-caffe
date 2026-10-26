import { errorResponse } from "./errors";

const INVALID_COORDINATES = "Toạ độ không hợp lệ.";

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseLatitude(value: unknown): number | Response {
  return isFiniteNumber(value) && value >= -90 && value <= 90 ? value : errorResponse(400, INVALID_COORDINATES);
}

export function parseLongitude(value: unknown): number | Response {
  return isFiniteNumber(value) && value >= -180 && value <= 180 ? value : errorResponse(400, INVALID_COORDINATES);
}

// Query strings are text; Number("") is 0, so blank values are rejected explicitly.
export function parseCoordinateParams(params: URLSearchParams): { latitude: number; longitude: number } | null | Response {
  const lat = params.get("lat");
  const lng = params.get("lng");
  if (lat === null && lng === null) return null;
  if (!lat?.trim() || !lng?.trim()) return errorResponse(400, INVALID_COORDINATES);

  const latitude = parseLatitude(Number(lat));
  if (latitude instanceof Response) return latitude;
  const longitude = parseLongitude(Number(lng));
  if (longitude instanceof Response) return longitude;
  return { latitude, longitude };
}

function parseName(value: unknown): string | Response {
  const name = typeof value === "string" ? value.trim() : "";
  return name || errorResponse(400, "Tên chi nhánh không được để trống.");
}

function parseRadius(value: unknown): number | Response {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : errorResponse(400, "Bán kính phải là số nguyên dương.");
}

function parseAddress(value: unknown): string | Response {
  return typeof value === "string" ? value.trim() : errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
}

function parseMapsUrl(value: unknown): string | null | Response {
  if (value === null) return null;
  if (typeof value !== "string") return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
  return value.trim() || null;
}

// On create every required field must be present; on update only the fields sent are parsed.
export function parseBranchFields(body: Record<string, unknown>, isCreate: boolean): Record<string, unknown> | Response {
  const update: Record<string, unknown> = {};
  const fields: [string, string, (value: unknown) => unknown, boolean][] = [
    ["name", "name", parseName, true],
    ["address", "address", parseAddress, false],
    ["googleMapsUrl", "google_maps_url", parseMapsUrl, false],
    ["latitude", "latitude", parseLatitude, true],
    ["longitude", "longitude", parseLongitude, true],
    ["radiusM", "radius_m", parseRadius, true],
  ];
  for (const [key, column, parse, required] of fields) {
    if (!(key in body) && !(isCreate && required)) continue;
    const parsed = parse(body[key]);
    if (parsed instanceof Response) return parsed;
    update[column] = parsed;
  }
  if (!isCreate && "isActive" in body) {
    if (typeof body.isActive !== "boolean") return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
    update.is_active = body.isActive;
  }
  return update;
}
