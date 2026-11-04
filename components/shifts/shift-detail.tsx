"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { ShiftActions } from "@/components/shifts/shift-actions";
import { ShiftTimeForm } from "@/components/shifts/shift-time-form";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime, formatTime } from "@/lib/date";
import { hasShiftPermission, isAdmin } from "@/lib/shifts/access";
import { auditActionLabel, formatCheckOut, formatFailReasons, formatShiftDuration } from "@/lib/shifts/labels";
import type { CurrentUser } from "@/types/employee";
import type { AuditLog, Shift } from "@/types/shift";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

type ShiftDetailData = { shift: Shift; auditLogs: AuditLog[] };

type CheckPoint = {
  title: "Check in" | "Check out";
  time: string | null;
  photoUrl: string | null;
  photosDeleted: boolean;
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
            <img src={point.photoUrl} alt={`Ảnh ${name}`} className="w-full max-w-sm rounded-lg border border-[var(--line)]" />
          ) : (
            <p>{point.photosDeleted ? "Ảnh đã xoá khi chốt lương" : "Không có ảnh"}</p>
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
  onDone: (message: string) => void;
};

function ShiftView({ user, shift, auditLogs, headingRef, onDone }: ShiftViewProps) {
  // Managers never handle their own shifts; only an admin or director may.
  const canHandle = isAdmin(user) || shift.employeeId !== user.id;
  const canEditTimes = canHandle && hasShiftPermission(user, "shifts.edit");
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const reviewActions = canHandle && hasShiftPermission(user, "shifts.review") && (
    <ShiftActions shift={shift} onDone={onDone} />
  );
  // A sticky bar only stays pinned while its container continues below it, so the waiting-shift bar goes last.
  const isWaiting = shift.status === "pending_review";

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
          <dt className="ui-hint">Tổng giờ</dt>
          <dd className="flex items-center justify-between gap-2">
            <span>
              {shift.checkOutAt ? (
                <>
                  <span className="font-semibold">{formatShiftDuration(shift)}</span>
                  <span className="text-[var(--muted)]">
                    {" "}
                    · {formatTime(shift.checkInAt)} – {formatCheckOut(shift)}
                  </span>
                </>
              ) : (
                "Chưa có giờ ra"
              )}
            </span>
            {canEditTimes && (
              <button
                type="button"
                onClick={() => setIsEditingTimes(true)}
                aria-label="Sửa giờ làm"
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] ${focusClass}`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                  <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                  <path d="m13.5 6.5 4 4" />
                </svg>
              </button>
            )}
          </dd>
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
          photosDeleted: shift.photosDeleted,
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
          photosDeleted: shift.photosDeleted,
          latitude: shift.checkOutLatitude,
          longitude: shift.checkOutLongitude,
          distanceM: shift.checkOutDistanceM,
          accuracyM: shift.checkOutAccuracyM,
        }}
      />
      {!isWaiting && reviewActions}
      {canEditTimes && (
        <Modal open={isEditingTimes} title="Sửa giờ làm" onClose={() => setIsEditingTimes(false)}>
          {/* Mounted only while open, so reopening starts from the saved times instead of an abandoned edit. */}
          {isEditingTimes && (
            <ShiftTimeForm
              shift={shift}
              onSaved={() => {
                setIsEditingTimes(false);
                onDone("Đã lưu giờ làm.");
              }}
            />
          )}
        </Modal>
      )}
      <AuditLogSection auditLogs={auditLogs} />
      {isWaiting && reviewActions}
    </>
  );
}

export function ShiftDetail({ shiftId }: { shiftId: string }) {
  const me = useFetch<CurrentUser>("/api/me");
  const detail = useFetch<ShiftDetailData>(`/api/shifts/${shiftId}`);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const showToast = useToast();

  function handleDone(message: string) {
    showToast(message);
    detail.reload();
    // The used control unmounts on reload (approve button, review section, keyed time form), so focus goes to the heading.
    headingRef.current?.focus();
  }

  const loadError = me.error ?? detail.error;

  return (
    <div className="flex flex-col gap-8">
      {loadError ? (
        <ErrorMessage message={loadError} />
      ) : me.data && detail.data ? (
        <ShiftView
          user={me.data}
          shift={detail.data.shift}
          auditLogs={detail.data.auditLogs}
          headingRef={headingRef}
          onDone={handleDone}
        />
      ) : (
        <Loading label="Đang tải..." />
      )}
    </div>
  );
}
