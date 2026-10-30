"use client";

import { useEffect, useRef, useState } from "react";
import { BranchPicker } from "@/components/attendance/branch-picker";
import { CameraCapture } from "@/components/attendance/camera-capture";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { formatDate, formatTime, toVietnamLocalInput } from "@/lib/date";
import { formatFailReasons } from "@/lib/shifts/labels";
import type { Branch, BranchWithDistance } from "@/types/branch";
import type { Shift } from "@/types/shift";

const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
// The geolocation timeout does not count time spent on the permission prompt, and some browsers never call back.
const LOCATION_GIVE_UP_MS = 20000;

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const primaryButtonClass = "ui-btn min-h-14 w-full text-base";

const todayFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const clockFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Mode = "check-in" | "check-out" | "start-new";
type Location = { latitude: number; longitude: number; accuracyM: number };
type Outcome = { isSuccess: boolean; message: string };

function requestLocation(): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const giveUp = window.setTimeout(() => resolve(null), LOCATION_GIVE_UP_MS);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.clearTimeout(giveUp);
        resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracyM: coords.accuracy });
      },
      () => {
        window.clearTimeout(giveUp);
        resolve(null);
      },
      LOCATION_OPTIONS,
    );
  });
}

const shortDate = (date: string) => formatDate(date).slice(0, 5);

function resultMessage(mode: Mode, shift: Shift, unfinishedDate: string | null) {
  const action = mode === "check-out" ? "Đã check out" : mode === "start-new" ? "Đã vào ca mới" : "Đã check in";
  const done = `${action} lúc ${formatTime(shift.checkOutAt ?? shift.checkInAt)}`;
  const review = shift.failReasons.length > 0 ? `, chờ quản lý duyệt: ${formatFailReasons(shift.failReasons)}` : "";
  const unfinished =
    mode === "start-new" && unfinishedDate ? ` Ca ngày ${shortDate(unfinishedDate)} chờ quản lý nhập giờ ra.` : "";
  return `${done}${review}.${unfinished}`;
}

function AttendanceIcon({ name }: { name: "arrow" | "pin" | "check" }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    pin: (
      <>
        <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {paths[name]}
    </svg>
  );
}

type AttendanceOverviewProps = {
  now: Date | null;
  openShift: Shift | null;
  onStart: (mode: Mode) => void;
};

function AttendanceOverview({ now, openShift, onStart }: AttendanceOverviewProps) {
  const timeLabel = now ? clockFormatter.format(now) : "--:--";
  const todayLabel = now ? todayFormatter.format(now) : "Hôm nay";
  const today = now ? toVietnamLocalInput(now.toISOString()).slice(0, 10) : null;

  // A shift still open from an earlier day almost always means the employee forgot to check out.
  if (openShift && today !== null && openShift.workDate < today) {
    const day = shortDate(openShift.workDate);
    return (
      <section className="ui-card flex flex-col gap-5 rounded-lg border-[var(--bloom)] bg-[var(--bloom-soft)]">
        <div className="flex flex-col gap-1">
          <p className="ui-eyebrow text-[var(--warning)]">Chưa kết thúc ca</p>
          <h2 className="ui-heading text-2xl">Ca ngày {day} chưa kết thúc</h2>
          <p className="text-sm text-[var(--muted)]">
            Bắt đầu lúc {formatTime(openShift.checkInAt)}, {day}
            {openShift.branchName ? ` · ${openShift.branchName}` : ""}
          </p>
        </div>
        <p className="text-sm leading-6">
          Nếu ca đó đã xong, bấm <strong>Vào ca mới</strong>. Quản lý sẽ nhập giờ ra cho ca {day}; ca đó chưa được tính lương
          cho tới khi có giờ ra.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => onStart("start-new")} className={primaryButtonClass}>
            Vào ca mới
            <span className="ml-2"><AttendanceIcon name="arrow" /></span>
          </button>
          <button type="button" onClick={() => onStart("check-out")} className="ui-btn-quiet min-h-12 w-full">
            Kết thúc ca {day} bây giờ
          </button>
        </div>
      </section>
    );
  }

  if (openShift) {
    return (
      <section className="relative overflow-hidden rounded-lg bg-[linear-gradient(160deg,#5f8466_0%,#3f5c47_100%)] p-5 text-[var(--surface)] shadow-[0_24px_48px_-32px_rgba(44,58,49,0.8)] sm:p-7">
        <div aria-hidden="true" className="absolute -top-16 -right-10 size-48 rounded-full bg-[var(--bloom)] opacity-25 blur-2xl" />
        <div className="relative mb-10 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--surface)_16%,transparent)] px-3 py-1.5 text-xs font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-[var(--bloom)]" />
            Bạn đang trong ca
          </span>
          <span suppressHydrationWarning className="text-sm capitalize text-[color-mix(in_oklab,var(--surface)_70%,transparent)]">{todayLabel}</span>
        </div>

        <p className="relative text-sm text-[color-mix(in_oklab,var(--surface)_70%,transparent)]">Bắt đầu lúc</p>
        <p className="relative mt-1 font-[family-name:var(--font-display)] text-[clamp(3.25rem,15vw,5.5rem)] leading-none font-medium tracking-[-0.03em]">
          {formatTime(openShift.checkInAt)}
        </p>
        <div className="relative mt-7 flex items-center gap-2 border-t border-[color-mix(in_oklab,var(--surface)_18%,transparent)] pt-5 text-sm">
          <AttendanceIcon name="pin" />
          <span className="font-semibold">{openShift.branchName ?? "Chưa có tên chi nhánh"}</span>
        </div>

        <div className="relative mt-8">
          <button
            type="button"
            onClick={() => onStart("check-out")}
            className="ui-btn min-h-14 w-full bg-[var(--surface)] text-base text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            Kết thúc ca
            <span className="ml-2"><AttendanceIcon name="arrow" /></span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ui-card relative overflow-hidden rounded-lg">
      <div aria-hidden="true" className="absolute -top-16 -right-12 size-44 rounded-full bg-[var(--bloom)] opacity-20 blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-10 size-44 rounded-full bg-[var(--accent)] opacity-10 blur-2xl" />
      <div className="relative">
        <p suppressHydrationWarning className="text-sm font-medium capitalize text-[var(--muted)]">{todayLabel}</p>
        <p suppressHydrationWarning className="mt-3 font-[family-name:var(--font-display)] text-[clamp(3.75rem,18vw,6rem)] leading-none font-medium tracking-[-0.03em]">
          {timeLabel}
        </p>
        <button type="button" onClick={() => onStart("check-in")} className={`${primaryButtonClass} mt-6`}>
          Vào ca
          <span className="ml-2"><AttendanceIcon name="arrow" /></span>
        </button>
      </div>
    </section>
  );
}

type AttendanceFlowProps = {
  mode: Mode;
  // The work date of the shift left open, named in the message after starting a new shift.
  unfinishedDate: string | null;
  // Check out happens at the open shift's branch, so its name labels the photo.
  openShiftBranchName: string | null;
  onCancel: () => void;
  onDone: (outcome: Outcome) => void;
};

function AttendanceFlow({ mode, unfinishedDate, openShiftBranchName, onCancel, onDone }: AttendanceFlowProps) {
  const { mutate, isPending } = useMutation<Shift>();
  // undefined while the browser is still answering, null when it cannot give a position.
  const [location, setLocation] = useState<Location | null | undefined>(undefined);
  const [chosenBranchId, setChosenBranchId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);

  const needsBranch = mode !== "check-out";
  const isLocating = location === undefined;
  const branchesUrl =
    needsBranch && !isLocating
      ? location
        ? `/api/branches?lat=${location.latitude}&lng=${location.longitude}`
        : "/api/branches"
      : null;
  const branches = useFetch<Array<Branch | BranchWithDistance>>(branchesUrl);
  const branchList = branches.data ?? [];
  const inRadius = branchList.filter((branch) => "distanceM" in branch && branch.distanceM <= branch.radiusM);
  // The employee chooses only when two branches overlap or none is in range; one match is taken as is.
  const pickerBranches = inRadius.length === 1 ? [] : inRadius.length > 1 ? inRadius : branchList;
  const branchId = chosenBranchId ?? inRadius[0]?.id ?? (location ? (branchList[0]?.id ?? "") : "");
  const isResolvingBranch = needsBranch && (isLocating || (branches.data === null && !branches.error));
  const branchLabel = needsBranch
    ? isResolvingBranch
      ? "Đang xác định chi nhánh..."
      : (branchList.find((branch) => branch.id === branchId)?.name ?? "Chưa chọn chi nhánh")
    : (openShiftBranchName ?? "Chi nhánh của ca đang mở");
  const reviewNote =
    location === null
      ? "Không lấy được vị trí. Ca này sẽ chờ quản lý duyệt."
      : needsBranch && branches.data !== null && branches.data.length > 0 && inRadius.length === 0
        ? "Bạn đang ở ngoài bán kính chi nhánh. Ca này sẽ chờ quản lý duyệt."
        : null;
  const canConfirm = photo !== null && !isLocating && !isPending && (!needsBranch || branchId !== "");

  useEffect(() => {
    let isCancelled = false;
    requestLocation().then((nextLocation) => {
      if (!isCancelled) setLocation(nextLocation);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleConfirm() {
    if (!photo) return;
    const body = new FormData();
    body.append("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
    if (location) {
      body.append("latitude", String(location.latitude));
      body.append("longitude", String(location.longitude));
      body.append("accuracyM", String(location.accuracyM));
    }
    if (needsBranch) body.append("branchId", branchId);
    if (mode === "start-new") body.append("startNew", "true");

    let shift: Shift;
    try {
      shift = await mutate(mode === "check-out" ? "/api/attendance/check-out" : "/api/attendance/check-in", {
        method: "POST",
        body,
      });
    } catch (error) {
      onDone({ isSuccess: false, message: (error as Error).message });
      return;
    }
    onDone({ isSuccess: true, message: resultMessage(mode, shift, unfinishedDate) });
  }

  return (
    <CameraCapture
      onCapture={setPhoto}
      onCancel={onCancel}
      overlay={
        <>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AttendanceIcon name="pin" />
            {branchLabel}
          </p>
          {reviewNote && <p className="mt-1 text-xs leading-5 text-[var(--bloom)]">{reviewNote}</p>}
        </>
      }
      confirmAction={
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="min-h-11 whitespace-nowrap rounded-full bg-white px-5 text-base font-semibold text-black disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {isPending ? "Đang gửi..." : "Xác nhận"}
        </button>
      }
    >
      {needsBranch && branches.error && <ErrorMessage message={branches.error} />}
      {needsBranch && branches.data?.length === 0 && <ErrorMessage message="Chưa có chi nhánh nào. Bạn báo quản lý." />}
      {photo && needsBranch && pickerBranches.length > 0 && (
        <BranchPicker branches={pickerBranches} value={branchId} onChange={setChosenBranchId} />
      )}
    </CameraCapture>
  );
}

export function CheckInPanel() {
  const { data, error, reload } = useFetch<{ shift: Shift | null }>("/api/attendance/current");
  const [flowKey, setFlowKey] = useState(0);
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [now, setNow] = useState(() => new Date());
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  function resetFlow() {
    setFlowKey((key) => key + 1);
    setActiveMode(null);
  }

  function focusHeading() {
    headingRef.current?.focus();
  }

  function handleStart(mode: Mode) {
    setOutcome(null);
    setActiveMode(mode);
    focusHeading();
  }

  function handleCancel() {
    resetFlow();
    focusHeading();
  }

  function handleDone(next: Outcome) {
    setOutcome(next);
    resetFlow();
    focusHeading();
    reload();
  }

  const title =
    activeMode === "check-out"
      ? "Kết thúc ca"
      : activeMode === "start-new"
        ? "Vào ca mới"
        : activeMode
          ? "Vào ca"
          : "Chấm công";

  return (
    // While checking in, the panel is exactly one phone screen tall: the shell's top bar and bottom nav take 12rem.
    <div
      className={`mx-auto flex w-full max-w-3xl flex-col ${
        activeMode ? "h-[calc(100dvh-12rem-env(safe-area-inset-bottom))] gap-3 md:h-auto" : "gap-4"
      }`}
    >
      <h1 ref={headingRef} tabIndex={-1} className={`ui-heading w-fit rounded text-2xl ${focusClass}`}>
        {title}
      </h1>

      {outcome && (
        <div
          role={outcome.isSuccess ? "status" : undefined}
          className={`flex items-start gap-3 rounded-lg p-4 text-sm leading-6 ${
            outcome.isSuccess ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
          <span className="mt-0.5"><AttendanceIcon name={outcome.isSuccess ? "check" : "pin"} /></span>
          {outcome.isSuccess ? <p className="font-semibold">{outcome.message}</p> : <ErrorMessage message={outcome.message} />}
        </div>
      )}

      {error ? (
        <ErrorMessage message={error} />
      ) : !data ? (
        <div className="ui-card rounded-lg">
          <Loading label="Đang kiểm tra ca hiện tại..." />
        </div>
      ) : activeMode ? (
        <AttendanceFlow
          key={flowKey}
          mode={activeMode}
          unfinishedDate={data.shift?.workDate ?? null}
          openShiftBranchName={data.shift?.branchName ?? null}
          onCancel={handleCancel}
          onDone={handleDone}
        />
      ) : (
        <AttendanceOverview now={now} openShift={data.shift} onStart={handleStart} />
      )}
    </div>
  );
}
