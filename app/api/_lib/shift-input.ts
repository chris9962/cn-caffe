import { errorResponse } from "./errors";

export const SHIFT_STATUSES = new Set<string>(["open", "missing_checkout", "pending_review", "valid", "rejected"]);

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const invalidBodyResponse = () => errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");

// A bare local time would be read in the server's zone, so only strings with an explicit offset pass.
export function parseInstant(value: unknown): string | Response {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value) || Number.isNaN(Date.parse(value))) {
    return errorResponse(400, "Thời gian không hợp lệ.");
  }
  // Date.parse rolls 2026-02-30 over to March, but Postgres rejects it (22008), so the date must round-trip.
  const day = value.slice(0, 10);
  if (day.startsWith("0000") || !new Date(`${day}T00:00:00Z`).toISOString().startsWith(day)) {
    return errorResponse(400, "Thời gian không hợp lệ.");
  }
  return value;
}

export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000") && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}
