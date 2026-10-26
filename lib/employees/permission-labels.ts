import type { ManagerPermission } from "@/types/employee";

export const PERMISSION_LABELS: Record<ManagerPermission, string> = {
  "shifts.view": "Xem ca",
  "shifts.review": "Duyệt và từ chối ca",
  "shifts.edit": "Sửa ca và thêm ca thủ công",
};
