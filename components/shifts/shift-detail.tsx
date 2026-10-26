"use client";

import { useId, useRef, useState, type RefObject } from "react";
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
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

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
    <section aria-labelledby={headingId} className="ui-card flex max-w-2xl flex-col gap-4">
      <h2 id={headingId} className="ui-heading">
        {point.title}
      </h2>
      {point.time === null ? (
        <p>Chưa có {name}.</p>
      ) : (
        <>
          <p>Lúc {formatDateTime(point.time)}</p>
          {point.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the signed URL changes on every load, so next/image could never reuse its optimised copy.
            <img src={point.photoUrl} alt={`Ảnh ${name}`} className="w-full max-w-sm rounded-[1.25rem] border border-[var(--line)]" />
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
                className={"ui-link w-fit"}
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
    <section aria-labelledby={headingId} className="ui-card flex max-w-2xl flex-col gap-4">
      <h2 id={headingId} className="ui-heading">
        Nhật ký thay đổi
      </h2>
      {auditLogs.length === 0 ? (
        <p>Chưa có thay đổi nào.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <caption className="sr-only">Nhật ký thay đổi của ca</caption>
            <thead>
              <tr>
                <th scope="col">Thao tác</th>
                <th scope="col">Người thực hiện</th>
                <th scope="col">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{auditActionLabel(log.action)}</td>
                  <td>{log.actorName ?? "—"}</td>
                  <td>{formatDateTime(log.createdAt)}</td>
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
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
  onDone: () => void;
};

function ShiftView({ user, shift, auditLogs, headingRef, onStart, onDone }: ShiftViewProps) {
  // Managers never handle their own shifts; only an admin or director may.
  const canHandle = isAdmin(user) || shift.employeeId !== user.id;

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className={`ui-title rounded ${focusClass}`}>
          Ca ngày {formatDate(shift.workDate)} của {shift.employeeName}
        </h1>
        <dl className="ui-card grid max-w-2xl grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
          <dt className="ui-hint">Nhân viên</dt>
          <dd>{shift.employeeName}</dd>
          <dt className="ui-hint">Chi nhánh</dt>
          <dd>{shift.branchName}</dd>
          <dt className="ui-hint">Trạng thái</dt>
          <dd>
            <StatusBadge status={shift.status} />
          </dd>
          <dt className="ui-hint">Lý do</dt>
          <dd>{shift.failReasons.length > 0 ? formatFailReasons(shift.failReasons) : "—"}</dd>
          <dt className="ui-hint">Nguồn</dt>
          <dd>{shift.source === "manual" ? "Thủ công" : "Check in"}</dd>
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
  const headingRef = useRef<HTMLHeadingElement>(null);

  function clearSaved() {
    setSaved(false);
  }

  function handleDone() {
    setSaved(true);
    detail.reload();
    // The used control unmounts on reload (approve button, review section, keyed time form), so focus goes to the heading.
    headingRef.current?.focus();
  }

  const loadError = me.error ?? detail.error;

  return (
    <div className="flex flex-col gap-8">
      <div role="status" className="ui-saved">{saved ? "Đã lưu." : null}</div>
      {loadError ? (
        <ErrorMessage message={loadError} />
      ) : me.data && detail.data ? (
        <ShiftView
          user={me.data}
          shift={detail.data.shift}
          auditLogs={detail.data.auditLogs}
          headingRef={headingRef}
          onStart={clearSaved}
          onDone={handleDone}
        />
      ) : (
        <Loading label="Đang tải..." />
      )}
    </div>
  );
}
