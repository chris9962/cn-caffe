import { STATUS_LABELS } from "@/lib/shifts/labels";
import type { ShiftStatus } from "@/types/shift";

const STATUS_CLASSES: Record<ShiftStatus, string> = {
  open: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  missing_checkout: "bg-[var(--warning-soft)] text-[var(--warning)]",
  pending_review: "bg-[var(--bloom-soft)] text-[var(--warning)]",
  valid: "bg-[var(--success-soft)] text-[var(--success)]",
  rejected: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function StatusBadge({ status }: { status: ShiftStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}
