import type { FailReason, ShiftStatus } from "@/types/shift";

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

export function formatFailReasons(reasons: FailReason[]) {
  return reasons.map((reason) => FAIL_REASON_LABELS[reason]).join(", ");
}
