"use client";

import { useId, useState } from "react";
import { ShiftActions } from "@/components/shifts/shift-actions";
import { ShiftTimeForm } from "@/components/shifts/shift-time-form";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatDate, formatDateTime } from "@/lib/date";
import { hasShiftPermission, isAdmin } from "@/lib/shifts/access";
import { auditActionLabel, formatFailReasons } from "@/lib/shifts/labels";
import type { CurrentUser } from "@/types/employee";
import type { AuditLog, Shift } from "@/types/shift";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

type ShiftDetailData = { shift: Shift; auditLogs: AuditLog[] };

type CheckPoint = {
  title: "Check in" | "Check out";
  time: string | null;
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceM: number | null;
  accuracyM: number | null;
};

function distanceText({ distanceM, accuracyM }: CheckPoint) {
  if (distanceM === null) return null;
  const distance = `Cách chi nhánh ${Math.round(distanceM)} m`;
  return accuracyM === null ? distance : `${distance}, sai số ${Math.round(accuracyM)} m`;
}

function CheckPointSection({ point }: { point: CheckPoint }) {
  const headingId = useId();
  const name = point.title.toLowerCase();
  const distance = distanceText(point);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-xl font-semibold">
        {point.title}
      </h2>
      {point.time === null ? (
        <p>Chưa có {name}.</p>
      ) : (
        <>
          <p>Lúc {formatDateTime(point.time)}</p>
          {point.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the signed URL changes on every load, so next/image could never reuse its optimised copy.
            <img src={point.photoUrl} alt={`Ảnh ${name}`} className="w-full max-w-sm rounded" />
          ) : (
            <p>Không có ảnh</p>
          )}
          {point.latitude === null || point.longitude === null ? (
            <p>Không có vị trí</p>
          ) : (
            <>
              {distance && <p>{distance}</p>}
              <a
                href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-fit rounded underline ${focusClass}`}
              >
                Mở vị trí trên Google Maps
                <span className="sr-only"> lúc {name} (mở tab mới)</span>
              </a>
            </>
          )}
        </>
      )}
    </section>
  );
}

function AuditLogSection({ auditLogs }: { auditLogs: AuditLog[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-xl font-semibold">
        Nhật ký thay đổi
      </h2>
      {auditLogs.length === 0 ? (
        <p>Chưa có thay đổi nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Nhật ký thay đổi của ca</caption>
            <thead>
              <tr className="border-b border-zinc-300">
                <th scope="col" className="p-2">Thao tác</th>
                <th scope="col" className="p-2">Người thực hiện</th>
                <th scope="col" className="p-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-200">
                  <td className="p-2">{auditActionLabel(log.action)}</td>
                  <td className="p-2">{log.actorName ?? "—"}</td>
                  <td className="p-2">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type ShiftViewProps = {
  user: CurrentUser;
  shift: Shift;
  auditLogs: AuditLog[];
  onStart: () => void;
  onDone: () => void;
};

function ShiftView({ user, shift, auditLogs, onStart, onDone }: ShiftViewProps) {
  // Managers never handle their own shifts; only an admin or director may.
  const canHandle = isAdmin(user) || shift.employeeId !== user.id;

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          Ca ngày {formatDate(shift.workDate)} của {shift.employeeName}
        </h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="font-medium">Nhân viên</dt>
          <dd>{shift.employeeName}</dd>
          <dt className="font-medium">Chi nhánh</dt>
          <dd>{shift.branchName}</dd>
          <dt className="font-medium">Trạng thái</dt>
          <dd>
            <StatusBadge status={shift.status} />
          </dd>
          <dt className="font-medium">Lý do</dt>
          <dd>{shift.failReasons.length > 0 ? formatFailReasons(shift.failReasons) : "—"}</dd>
          <dt className="font-medium">Nguồn</dt>
          <dd>{shift.source === "manual" ? "Nhập tay" : "Check in"}</dd>
        </dl>
      </div>
      <CheckPointSection
        point={{
          title: "Check in",
          time: shift.checkInAt,
          photoUrl: shift.checkInPhotoUrl,
          latitude: shift.checkInLatitude,
          longitude: shift.checkInLongitude,
          distanceM: shift.checkInDistanceM,
          accuracyM: shift.checkInAccuracyM,
        }}
      />
      <CheckPointSection
        point={{
          title: "Check out",
          time: shift.checkOutAt,
          photoUrl: shift.checkOutPhotoUrl,
          latitude: shift.checkOutLatitude,
          longitude: shift.checkOutLongitude,
          distanceM: shift.checkOutDistanceM,
          accuracyM: shift.checkOutAccuracyM,
        }}
      />
      {canHandle && hasShiftPermission(user, "shifts.review") && (
        <ShiftActions shift={shift} onStart={onStart} onDone={onDone} />
      )}
      {canHandle && hasShiftPermission(user, "shifts.edit") && (
        // Keyed by the saved times so the inputs show the server's values after each reload.
        <ShiftTimeForm
          key={`${shift.id}-${shift.checkInAt}-${shift.checkOutAt}`}
          shift={shift}
          onStart={onStart}
          onSaved={onDone}
        />
      )}
      <AuditLogSection auditLogs={auditLogs} />
    </>
  );
}

export function ShiftDetail({ shiftId }: { shiftId: string }) {
  const me = useFetch<CurrentUser>("/api/me");
  const detail = useFetch<ShiftDetailData>(`/api/shifts/${shiftId}`);
  const [saved, setSaved] = useState(false);

  function clearSaved() {
    setSaved(false);
  }

  function handleDone() {
    setSaved(true);
    detail.reload();
  }

  const loadError = me.error ?? detail.error;

  return (
    <div className="flex flex-col gap-8">
      <div role="status">{saved ? "Đã lưu." : null}</div>
      {loadError ? (
        <ErrorMessage message={loadError} />
      ) : me.data && detail.data ? (
        <ShiftView
          user={me.data}
          shift={detail.data.shift}
          auditLogs={detail.data.auditLogs}
          onStart={clearSaved}
          onDone={handleDone}
        />
      ) : (
        <Loading label="Đang tải..." />
      )}
    </div>
  );
}
