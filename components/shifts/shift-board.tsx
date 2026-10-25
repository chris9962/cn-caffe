"use client";

import Link from "next/link";
import { useState } from "react";
import { ShiftFilters, type ShiftFilterValues } from "@/components/shifts/shift-filters";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch } from "@/hooks/use-fetch";
import { currentMonth, formatDate, formatTime } from "@/lib/date";
import { hasShiftPermission, managedBranches } from "@/lib/shifts/access";
import { formatCheckOut, formatFailReasons } from "@/lib/shifts/labels";
import type { Branch } from "@/types/branch";
import type { CurrentUser } from "@/types/employee";
import type { Shift } from "@/types/shift";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

// A cleared month input gives "", which the API would reject as an invalid month.
function shiftsUrl({ month, branchId, status }: ShiftFilterValues) {
  if (month === "") return null;
  const params = new URLSearchParams({ month });
  if (branchId !== "") params.set("branchId", branchId);
  if (status !== "") params.set("status", status);
  return `/api/shifts?${params}`;
}

export function ShiftBoard() {
  const me = useFetch<CurrentUser>("/api/me");
  const branches = useFetch<Branch[]>("/api/branches");
  const [filters, setFilters] = useState<ShiftFilterValues>(() => ({
    month: currentMonth(),
    branchId: "",
    status: "",
  }));
  const shifts = useFetch<Shift[]>(shiftsUrl(filters));

  const setupError = me.error ?? branches.error;
  if (setupError) return <ErrorMessage message={setupError} />;
  if (!me.data || !branches.data) return <Loading label="Đang tải..." />;

  return (
    <div className="flex flex-col gap-4">
      {hasShiftPermission(me.data, "shifts.edit") && (
        <Link
          href="/manage/shifts/new"
          className={`w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white ${focusClass}`}
        >
          Thêm ca bằng tay
        </Link>
      )}
      <ShiftFilters branches={managedBranches(me.data, branches.data)} value={filters} onChange={setFilters} />
      {shifts.isLoading ? (
        <Loading label="Đang tải..." />
      ) : shifts.error ? (
        <ErrorMessage message={shifts.error} />
      ) : shifts.data?.length === 0 ? (
        <p>Không có ca nào phù hợp.</p>
      ) : (
        shifts.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Danh sách ca tại chi nhánh</caption>
              <thead>
                <tr className="border-b border-zinc-300">
                  <th scope="col" className="p-2">Ảnh check in</th>
                  <th scope="col" className="p-2">Nhân viên</th>
                  <th scope="col" className="p-2">Chi nhánh</th>
                  <th scope="col" className="p-2">Ngày</th>
                  <th scope="col" className="p-2">Giờ vào</th>
                  <th scope="col" className="p-2">Giờ ra</th>
                  <th scope="col" className="p-2">Trạng thái</th>
                  <th scope="col" className="p-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {shifts.data.map((shift) => (
                  <tr key={shift.id} className="border-b border-zinc-200">
                    <td className="p-2">
                      {shift.source === "manual" ? (
                        "Nhập tay"
                      ) : shift.checkInPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- the signed URL changes on every load, so next/image could never reuse its optimised copy.
                        <img
                          src={shift.checkInPhotoUrl}
                          alt={`Ảnh check in của ${shift.employeeName}`}
                          width={48}
                          height={48}
                          className="size-12 rounded object-cover"
                        />
                      ) : (
                        "Không có ảnh"
                      )}
                    </td>
                    <td className="p-2">
                      <Link href={`/manage/shifts/${shift.id}`} className={`rounded underline ${focusClass}`}>
                        {shift.employeeName}
                        <span className="sr-only">
                          , ca ngày {formatDate(shift.workDate)} lúc {formatTime(shift.checkInAt)}
                        </span>
                      </Link>
                    </td>
                    <td className="p-2">{shift.branchName}</td>
                    <td className="p-2">{formatDate(shift.workDate)}</td>
                    <td className="p-2">{formatTime(shift.checkInAt)}</td>
                    <td className="p-2">{formatCheckOut(shift)}</td>
                    <td className="p-2">
                      <StatusBadge status={shift.status} />
                    </td>
                    <td className="p-2">{shift.failReasons.length > 0 ? formatFailReasons(shift.failReasons) : "—"}</td>
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
