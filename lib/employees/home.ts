import { hasShiftPermission } from "@/lib/shifts/access";
import type { CurrentUser } from "@/types/employee";

// Anyone who can manage shifts spends most of the day there, so it comes before their own attendance pages.
export function homePath(user: CurrentUser) {
  if (hasShiftPermission(user, "shifts.view")) return "/manage/shifts";
  return user.requiresAttendance ? "/check-in" : "/overview";
}
