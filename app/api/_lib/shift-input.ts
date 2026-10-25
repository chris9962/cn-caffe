import { errorResponse } from "./errors";

export const SHIFT_STATUSES = new Set<string>(["open", "missing_checkout", "pending_review", "valid", "rejected"]);

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export const invalidBodyResponse = () => errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");

// A bare local time would be read in the server's zone, so only strings with an explicit offset pass.
export function parseInstant(value: unknown): string | Response {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value) || Number.isNaN(Date.parse(value))) {
    return errorResponse(400, "Thời gian không hợp lệ.");
  }
  return value;
}
