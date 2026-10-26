import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date";
import type { BlockingShift } from "@/types/payroll";

export function BlockingShiftList({ shifts }: { shifts: BlockingShift[] }) {
  return (
    <section aria-labelledby="blocking-heading" className="ui-card flex flex-col gap-3">
      <h2 id="blocking-heading" className="ui-heading">
        Ca cần xử lý trước khi chốt
      </h2>
      <ul className="flex flex-col divide-y divide-[var(--line)]">
        {shifts.map((shift) => (
          <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <Link href={`/manage/shifts/${shift.id}`} className="ui-link">
              {shift.employeeName} · {formatDate(shift.workDate)}
            </Link>
            <StatusBadge status={shift.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
