import type { EmployeeRole, EmploymentType } from "@/types/employee";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: "Admin",
  director: "Giám đốc",
  manager: "Quản lý",
  staff: "Nhân viên",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Toàn thời gian",
  part_time: "Bán thời gian",
};

// Stored as 84 + 9 digits; staff type and read numbers starting with 0.
export function formatPhone(phone: string) {
  return `0${phone.slice(-9)}`;
}
