import { monthRange } from "@/lib/date";
import type { EmploymentType } from "@/types/employee";
import { errorResponse } from "./errors";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMPLOYMENT_TYPES = new Set<string>(["full_time", "part_time"]);
// Postgres integer columns hold amounts; this keeps a typo like an extra zero row from overflowing them.
const MAX_AMOUNT = 1_000_000_000;

// Returns the first day of the month, the form the database stores.
export function parseMonth(value: unknown): string | Response {
  return typeof value === "string" && monthRange(value) ? `${value}-01` : errorResponse(400, "Tháng không hợp lệ.");
}

export function parseDate(value: unknown, message: string): string | Response {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : null;
  // The round trip rejects dates that Date rolls over, such as 2026-02-30.
  const valid =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    date !== null &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
  return valid ? value : errorResponse(400, message);
}

export function parseTime(value: unknown, message: string): string | Response {
  return typeof value === "string" && TIME.test(value) ? value : errorResponse(400, message);
}

export function parsePositiveAmount(value: unknown, message: string): number | Response {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_AMOUNT
    ? (value as number)
    : errorResponse(400, message);
}

export function parseNonNegativeAmount(value: unknown, message: string): number | Response {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_AMOUNT
    ? (value as number)
    : errorResponse(400, message);
}

export function parseSignedAmount(value: unknown): number | Response {
  return Number.isInteger(value) && value !== 0 && Math.abs(value as number) <= MAX_AMOUNT
    ? (value as number)
    : errorResponse(400, "Số tiền phải là số nguyên khác 0.");
}

export function parseNote(value: unknown): string | Response {
  const note = typeof value === "string" ? value.trim() : "";
  return note || errorResponse(400, "Bạn cần ghi lý do cho khoản này.");
}

export function parseRateEmploymentType(value: unknown): EmploymentType | Response {
  return typeof value === "string" && EMPLOYMENT_TYPES.has(value)
    ? (value as EmploymentType)
    : errorResponse(400, "Loại nhân viên không hợp lệ.");
}
