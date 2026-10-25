import { normalizePhone } from "@/lib/auth/phone";
import type { EmployeeRole } from "@/types/employee";
import { errorResponse } from "./errors";

const ROLES = new Set<string>(["admin", "director", "manager", "staff"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DUPLICATE_PHONE = "Số điện thoại đã được dùng.";

export const duplicatePhoneResponse = () => errorResponse(409, DUPLICATE_PHONE);

export const isUuid = (value: string) => UUID.test(value);

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export function parseFullName(value: unknown): string | Response {
  const name = typeof value === "string" ? value.trim() : "";
  return name || errorResponse(400, "Họ tên không được để trống.");
}

export function parsePhone(value: unknown): string | Response {
  const phone = typeof value === "string" ? normalizePhone(value) : null;
  return phone ?? errorResponse(400, "Số điện thoại không hợp lệ.");
}

export function parseRole(value: unknown): EmployeeRole | Response {
  return typeof value === "string" && ROLES.has(value)
    ? (value as EmployeeRole)
    : errorResponse(400, "Vai trò không hợp lệ.");
}

export function parsePassword(value: unknown): string | Response {
  return typeof value === "string" && value.length >= 8
    ? value
    : errorResponse(400, "Mật khẩu phải có ít nhất 8 ký tự.");
}

export function parseEndDate(value: unknown): string | null | Response {
  if (value === null) return null;
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : null;
  // The round trip rejects dates that Date rolls over, such as 2026-02-30.
  const valid =
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    date !== null &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value);
  return valid ? value : errorResponse(400, "Ngày nghỉ việc không hợp lệ.");
}

export function isDuplicateAuthEmail(error: { code?: string; message: string }): boolean {
  return error.code === "email_exists" || /already.*registered/i.test(error.message);
}
