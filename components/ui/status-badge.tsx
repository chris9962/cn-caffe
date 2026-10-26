import { STATUS_LABELS } from "@/lib/shifts/labels";
import type { ShiftStatus } from "@/types/shift";

const STATUS_CLASSES: Record<ShiftStatus, string> = {
  open: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  missing_checkout: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  pending_review: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  valid: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status }: { status: ShiftStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium whitespace-nowrap ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
