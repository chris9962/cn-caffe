import type { EmployeeRole } from "@/types/employee";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: "Admin",
  director: "Giám đốc",
  manager: "Quản lý",
  staff: "Nhân viên",
};

// Stored as 84 + 9 digits; staff type and read numbers starting with 0.
export function formatPhone(phone: string) {
  return `0${phone.slice(-9)}`;
}
