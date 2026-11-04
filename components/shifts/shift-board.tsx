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
import type { ShiftList } from "@/types/shift";


// A cleared month input gives "", which the API would reject as an invalid month.
function shiftsUrl({ month, date, branchId, status }: ShiftFilterValues) {
  if (month === "") return null;
  const params = new URLSearchParams({ month });
  if (date !== "") params.set("date", date);
  if (branchId !== "") params.set("branchId", branchId);
  if (status !== "") params.set("status", status);
  return `/api/shifts?${params}`;
}

export function ShiftBoard() {
  const me = useFetch<CurrentUser>("/api/me");
  const branches = useFetch<Branch[]>("/api/branches");
  const [filters, setFilters] = useState<ShiftFilterValues>(() => ({
    month: currentMonth(),
    date: "",
    branchId: "",
    status: "",
  }));
  const shifts = useFetch<ShiftList>(shiftsUrl(filters));

  const setupError = me.error ?? branches.error;

  return (
    <div className="flex flex-col gap-4">
      {/* The heading lives here so the add button can sit beside it once permissions are known. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="ui-title">Quản lý ca</h1>
        {me.data && hasShiftPermission(me.data, "shifts.edit") && (
          <Link href="/manage/shifts/new" className="ui-btn">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm ca thủ công
          </Link>
        )}
      </div>
      {setupError ? (
        <ErrorMessage message={setupError} />
      ) : !me.data || !branches.data ? (
        <Loading label="Đang tải..." />
      ) : (
        <>
          <ShiftFilters branches={managedBranches(me.data, branches.data)} value={filters} onChange={setFilters} />
          {shifts.data && shifts.data.total > shifts.data.shifts.length && (
            <p role="status">
              Danh sách chỉ hiện {shifts.data.shifts.length}/{shifts.data.total} ca. Bạn lọc theo ngày, chi nhánh hoặc trạng
              thái để xem đủ.
            </p>
          )}
          {shifts.isLoading ? (
            <Loading label="Đang tải..." />
          ) : shifts.error ? (
            <ErrorMessage message={shifts.error} />
          ) : shifts.data?.shifts.length === 0 ? (
            <p>Không có ca nào phù hợp.</p>
          ) : (
            shifts.data && (
              <div className="ui-table-wrap">
                <table className="ui-table">
                  <caption className="sr-only">Danh sách ca tại chi nhánh</caption>
                  <thead>
                    <tr>
                      {/* w-px shrinks the column to the photo; the long header text used to set its width. */}
                      <th scope="col" className="w-px">
                        Ảnh<span className="sr-only"> check in</span>
                      </th>
                      {/* Short facts share a cell as two lines, so the reason column gets the remaining width. */}
                      <th scope="col" className="w-px">
                        Nhân viên
                      </th>
                      <th scope="col" className="w-px">
                        Thời gian
                      </th>
                      <th scope="col" className="w-px">
                        Trạng thái
                      </th>
                      <th scope="col" className="min-w-56">
                        Lý do
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.data.shifts.map((shift) => (
                      <tr key={shift.id}>
                        <td className="whitespace-nowrap">
                          {shift.source === "manual" ? (
                            "Thủ công"
                          ) : shift.checkInPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- the signed URL changes on every load, so next/image could never reuse its optimised copy.
                            <img
                              src={shift.checkInPhotoUrl}
                              alt={`Ảnh check in của ${shift.employeeName}`}
                              width={72}
                              height={72}
                              className="size-[4.5rem] rounded-xl object-cover"
                            />
                          ) : shift.photosDeleted ? (
                            "Ảnh đã xoá"
                          ) : (
                            "Không có ảnh"
                          )}
                        </td>
                        <td className="min-w-48">
                          <Link href={`/manage/shifts/${shift.id}`} className={"ui-link"}>
                            {shift.employeeName}
                            <span className="sr-only">
                              , ca ngày {formatDate(shift.workDate)} lúc {formatTime(shift.checkInAt)}
                            </span>
                          </Link>
                          <span className="mt-0.5 block text-sm text-[var(--muted)]">{shift.branchName}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="block">{formatDate(shift.workDate)}</span>
                          <span className="mt-0.5 block text-sm text-[var(--muted)]">
                            {shift.checkOutAt
                              ? `${formatTime(shift.checkInAt)} – ${formatCheckOut(shift)}`
                              : `Vào ${formatTime(shift.checkInAt)}`}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge status={shift.status} />
                        </td>
                        <td>{shift.failReasons.length > 0 ? formatFailReasons(shift.failReasons) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
