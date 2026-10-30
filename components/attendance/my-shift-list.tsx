"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth, formatDate, formatDuration, formatTime } from "@/lib/date";
import { formatCheckOut, formatFailReasons } from "@/lib/shifts/labels";
import type { Shift } from "@/types/shift";

function formatShiftDuration(shift: Shift) {
  if (!shift.checkOutAt) return "—";
  return formatDuration((Date.parse(shift.checkOutAt) - Date.parse(shift.checkInAt)) / 60000);
}

export function MyShiftList() {
  const [month, setMonth] = useState(() => currentMonth());
  // A cleared month input gives "", which the API would reject as an invalid month.
  const { data, error, isLoading } = useFetch<Shift[]>(
    month === "" ? null : `/api/shifts/mine?month=${encodeURIComponent(month)}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <MonthPicker value={month} onChange={setMonth} />
      {isLoading ? (
        <Loading label="Đang tải..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : data?.length === 0 ? (
        <p className="ui-card ui-lead text-center">Chưa có ca nào trong tháng này.</p>
      ) : (
        data && (
          <ul aria-label="Danh sách ca của tôi" className="flex flex-col gap-3">
            {data.map((shift) => (
              <li key={shift.id} className="ui-card flex flex-col gap-3 rounded-[1.5rem] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-lg font-medium">{formatDate(shift.workDate)}</p>
                    <p className="ui-hint">{shift.branchName}</p>
                  </div>
                  <StatusBadge status={shift.status} />
                </div>
                <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--background)] p-3 text-sm">
                  <div>
                    <dt className="ui-hint text-xs">Giờ vào</dt>
                    <dd className="font-semibold">{formatTime(shift.checkInAt)}</dd>
                  </div>
                  <div>
                    <dt className="ui-hint text-xs">Giờ ra</dt>
                    <dd className="font-semibold">{formatCheckOut(shift)}</dd>
                  </div>
                  <div>
                    <dt className="ui-hint text-xs">Thời lượng</dt>
                    <dd className="font-semibold">{formatShiftDuration(shift)}</dd>
                  </div>
                </dl>
                {shift.failReasons.length > 0 && (
                  <p className="ui-hint">Ghi chú: {formatFailReasons(shift.failReasons)}</p>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
