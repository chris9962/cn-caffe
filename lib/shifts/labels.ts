import { formatDateTime, formatTime, toVietnamLocalInput } from "@/lib/date";
import type { FailReason, Shift, ShiftStatus } from "@/types/shift";

export const STATUS_LABELS: Record<ShiftStatus, string> = {
  open: "Đang làm",
  missing_checkout: "Thiếu check out",
  pending_review: "Chờ duyệt",
  valid: "Hợp lệ",
  rejected: "Từ chối",
};

export const FAIL_REASON_LABELS: Record<FailReason, string> = {
  outside_radius: "Ngoài bán kính chi nhánh",
  location_unavailable: "Không lấy được vị trí",
  too_long: "Ca dài hơn thời lượng tối đa",
};

// A Map, not an object literal, so an action string like "constructor" can't hit a prototype key.
const AUDIT_ACTION_LABELS = new Map<string, string>([
  ["shift.approved", "Duyệt"],
  ["shift.rejected", "Từ chối"],
  ["shift.edited", "Sửa giờ"],
  ["shift.created_manually", "Thêm thủ công"],
  ["shift.abandoned", "Bắt đầu ca mới khi chưa check out"],
]);

export function formatFailReasons(reasons: FailReason[]) {
  return reasons.map((reason) => FAIL_REASON_LABELS[reason]).join(", ");
}

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS.get(action) ?? action;
}

export function formatCheckOut(shift: Shift) {
  if (!shift.checkOutAt) return "—";
  // A night shift ends on the next day, and the time alone would read as earlier than the check in.
  return toVietnamLocalInput(shift.checkOutAt).startsWith(shift.workDate)
    ? formatTime(shift.checkOutAt)
    : formatDateTime(shift.checkOutAt);
}
