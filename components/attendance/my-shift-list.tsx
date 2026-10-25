"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { MonthPicker } from "@/components/ui/month-picker";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth, formatDate, formatDateTime, formatDuration, formatTime, toVietnamLocalInput } from "@/lib/date";
import { formatFailReasons, STATUS_LABELS } from "@/lib/shifts/labels";
import type { Shift } from "@/types/shift";

function formatCheckOut(shift: Shift) {
  if (!shift.checkOutAt) return "—";
  // A night shift ends on the next day, and the time alone would read as earlier than the check in.
  return toVietnamLocalInput(shift.checkOutAt).startsWith(shift.workDate)
    ? formatTime(shift.checkOutAt)
    : formatDateTime(shift.checkOutAt);
}

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
    <div className="flex flex-col gap-4">
      <MonthPicker value={month} onChange={setMonth} />
      {isLoading ? (
        <Loading label="Đang tải..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : data?.length === 0 ? (
        <p>Chưa có ca nào trong tháng này.</p>
      ) : (
        data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Danh sách ca của tôi</caption>
              <thead>
                <tr className="border-b border-zinc-300">
                  <th scope="col" className="p-2">Ngày</th>
                  <th scope="col" className="p-2">Chi nhánh</th>
                  <th scope="col" className="p-2">Giờ vào</th>
                  <th scope="col" className="p-2">Giờ ra</th>
                  <th scope="col" className="p-2">Thời lượng</th>
                  <th scope="col" className="p-2">Trạng thái</th>
                  <th scope="col" className="p-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {data.map((shift) => (
                  <tr key={shift.id} className="border-b border-zinc-200">
                    <td className="p-2">{formatDate(shift.workDate)}</td>
                    <td className="p-2">{shift.branchName}</td>
                    <td className="p-2">{formatTime(shift.checkInAt)}</td>
                    <td className="p-2">{formatCheckOut(shift)}</td>
                    <td className="p-2">{formatShiftDuration(shift)}</td>
                    <td className="p-2">{STATUS_LABELS[shift.status]}</td>
                    <td className="p-2">{formatFailReasons(shift.failReasons)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
