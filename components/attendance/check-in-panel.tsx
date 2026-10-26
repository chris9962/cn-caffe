"use client";

import { useEffect, useRef, useState } from "react";
import { BranchPicker } from "@/components/attendance/branch-picker";
import { CameraCapture } from "@/components/attendance/camera-capture";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { formatTime } from "@/lib/date";
import { formatFailReasons } from "@/lib/shifts/labels";
import type { Branch, BranchWithDistance } from "@/types/branch";
import type { Shift } from "@/types/shift";

const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
// The geolocation timeout does not count time spent on the permission prompt, and some browsers never call back.
const LOCATION_GIVE_UP_MS = 20000;

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const primaryButtonClass = "ui-btn min-h-14 w-full text-base";
const secondaryButtonClass = `flex min-h-12 w-full items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--surface)_35%,transparent)] px-4 text-sm font-semibold transition-colors hover:bg-[color-mix(in_oklab,var(--surface)_10%,transparent)] ${focusClass}`;

const todayFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "numeric",
  hourCycle: "h23",
});

function greeting(now: Date) {
  const hour = Number(hourFormatter.format(now));
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

const clockFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Mode = "check-in" | "check-out" | "start-new";
type Step = "idle" | "locating" | "ready" | "submitting";
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

function resultMessage(mode: Mode, shift: Shift) {
  const action = mode === "check-out" ? "check out" : "check in";
  const done = `Đã ${action} lúc ${formatTime(shift.checkOutAt ?? shift.checkInAt)}`;
  if (shift.failReasons.length > 0) {
    return `${done}. Quản lý sẽ xem lại giúp bạn: ${formatFailReasons(shift.failReasons)}.`;
  }
  return mode === "check-out"
    ? `${done}. Cảm ơn bạn, về nghỉ ngơi thật ấm nhé.`
    : `${done}. Chúc bạn một ca thật êm.`;
}

function AttendanceIcon({ name }: { name: "arrow" | "pin" | "camera" | "check" }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    pin: (
      <>
        <path d="M12 21s7-5.1 7-12a7 7 0 1 0-14 0c0 6.9 7 12 7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7.5h3l1.5-2h7l1.5 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" />
        <circle cx="12" cy="13" r="3.5" />
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

  if (openShift) {
    return (
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,#5f8466_0%,#3f5c47_100%)] p-5 text-[var(--surface)] shadow-[0_24px_48px_-32px_rgba(44,58,49,0.8)] sm:p-7">
        <div aria-hidden="true" className="absolute -top-16 -right-10 size-48 rounded-full bg-[var(--bloom)] opacity-25 blur-2xl" />
        <div className="relative mb-10 flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--surface)_16%,transparent)] px-3 py-1.5 text-xs font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-[var(--bloom)]" />
            Bạn đang trong ca
          </span>
          <span suppressHydrationWarning className="text-sm capitalize text-[color-mix(in_oklab,var(--surface)_70%,transparent)]">{todayLabel}</span>
        </div>

        <p className="relative text-sm text-[color-mix(in_oklab,var(--surface)_70%,transparent)]">Bạn ghé quán lúc</p>
        <p className="relative mt-1 font-[family-name:var(--font-display)] text-[clamp(3.25rem,15vw,5.5rem)] leading-none font-medium tracking-[-0.03em]">
          {formatTime(openShift.checkInAt)}
        </p>
        <div className="relative mt-7 flex items-center gap-2 border-t border-[color-mix(in_oklab,var(--surface)_18%,transparent)] pt-5 text-sm">
          <AttendanceIcon name="pin" />
          <span className="font-semibold">{openShift.branchName ?? "Chưa có tên chi nhánh"}</span>
        </div>

        <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onStart("check-out")}
            className="ui-btn min-h-14 w-full bg-[var(--surface)] text-base text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            Xong ca rồi, check out
            <span className="ml-2"><AttendanceIcon name="arrow" /></span>
          </button>
          <button type="button" onClick={() => onStart("start-new")} className={secondaryButtonClass}>
            Quên check out ca trước
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ui-card relative overflow-hidden rounded-[2rem]">
      <div aria-hidden="true" className="absolute -top-16 -right-12 size-44 rounded-full bg-[var(--bloom)] opacity-20 blur-2xl" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-10 size-44 rounded-full bg-[var(--accent)] opacity-10 blur-2xl" />
      <div className="relative">
        <p suppressHydrationWarning className="text-sm font-medium capitalize text-[var(--muted)]">{todayLabel}</p>
        <p suppressHydrationWarning className="mt-3 font-[family-name:var(--font-display)] text-[clamp(3.75rem,18vw,6rem)] leading-none font-medium tracking-[-0.03em]">
          {timeLabel}
        </p>
        <div className="mt-8 mb-7">
          <h2 className="ui-heading text-2xl">Hôm nay mình bắt đầu nhé?</h2>
          <p className="ui-lead mt-1">
            Bật vị trí, rồi cười một chút cho tấm ảnh vào ca.
          </p>
        </div>
        <button type="button" onClick={() => onStart("check-in")} className={primaryButtonClass}>
          Vào ca thôi
          <span className="ml-2"><AttendanceIcon name="arrow" /></span>
        </button>
      </div>
    </section>
  );
}

function AttendanceProgress({ step }: { step: Step }) {
  const activeIndex = step === "locating" ? 0 : step === "ready" ? 1 : 2;
  const stages = [
    { label: "Vị trí", icon: "pin" as const },
    { label: "Ảnh", icon: "camera" as const },
    { label: "Xong rồi", icon: "check" as const },
  ];

  return (
    <ol aria-label="Tiến trình chấm công" className="grid grid-cols-3 gap-2">
      {stages.map((stage, index) => (
        <li
          key={stage.label}
          aria-current={index === activeIndex ? "step" : undefined}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${
            index <= activeIndex
              ? "bg-[var(--accent)] text-[var(--surface)]"
              : "bg-[var(--surface-strong)] text-[var(--muted)]"
          }`}
        >
          <AttendanceIcon name={stage.icon} />
          {stage.label}
        </li>
      ))}
    </ol>
  );
}

type AttendanceFlowProps = {
  mode: Mode;
  onCancel: () => void;
  onDone: (outcome: Outcome) => void;
};

function AttendanceFlow({ mode, onCancel, onDone }: AttendanceFlowProps) {
  const { mutate } = useMutation<Shift>();
  const [step, setStep] = useState<Step>("locating");
  const [location, setLocation] = useState<Location | null>(null);
  const [chosenBranchId, setChosenBranchId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);

  const needsBranch = mode !== "check-out";
  const branchesUrl =
    step === "ready" && needsBranch
      ? location
        ? `/api/branches?lat=${location.latitude}&lng=${location.longitude}`
        : "/api/branches"
      : null;
  const branches = useFetch<Array<Branch | BranchWithDistance>>(branchesUrl);
  const branchId = chosenBranchId ?? (location ? (branches.data?.[0]?.id ?? "") : "");
  const canCapture = !needsBranch || (branches.data !== null && branches.data.length > 0);

  useEffect(() => {
    let isCancelled = false;
    requestLocation().then((nextLocation) => {
      if (isCancelled) return;
      setLocation(nextLocation);
      setStep("ready");
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

    setStep("submitting");
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
    onDone({ isSuccess: true, message: resultMessage(mode, shift) });
  }

  const title = mode === "check-out" ? "Tạm biệt ca hôm nay" : "Ghé quán hôm nay";

  return (
    <section className="ui-card rounded-[2rem]">
      <div className="mb-6">
        <p className="ui-eyebrow mb-2">Một chút nữa thôi</p>
        <h2 className="ui-heading text-2xl">{title}</h2>
      </div>
      <AttendanceProgress step={step} />

      {step === "locating" && (
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <span className="mb-5 inline-flex size-16 animate-pulse items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <AttendanceIcon name="pin" />
          </span>
          <p className="font-semibold">Đang tìm xem bạn ở đâu</p>
          <p className="ui-lead mt-1 max-w-xs text-sm">Chờ mình vài giây nhé.</p>
        </div>
      )}

      {step === "submitting" && (
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <span className="mb-5 inline-flex size-16 animate-pulse items-center justify-center rounded-full bg-[var(--accent)] text-[var(--surface)]">
            <AttendanceIcon name="check" />
          </span>
          <p className="font-semibold">Đang ghi lại ca của bạn</p>
          <p className="ui-lead mt-1 text-sm">Ảnh và vị trí đang được gửi đi an toàn.</p>
        </div>
      )}

      {step === "ready" && (
        <div className="mt-6 flex flex-col gap-5">
          <div
            className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
              location ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"
            }`}
          >
            <span className="mt-0.5"><AttendanceIcon name="pin" /></span>
            <div>
              <p className="font-semibold">{location ? "Đã thấy bạn rồi" : "Chưa tìm được vị trí"}</p>
              <p className="mt-0.5 leading-5">
                {location
                  ? `Độ chính xác khoảng ${Math.round(location.accuracyM)} m.`
                  : "Không sao, bạn cứ tiếp tục — quản lý sẽ xem lại ca này."}
              </p>
            </div>
          </div>

          {needsBranch &&
            (branches.error ? (
              <ErrorMessage message={branches.error} />
            ) : branches.data === null ? (
              <Loading label="Đang tìm quán gần bạn..." />
            ) : branches.data.length === 0 ? (
              <ErrorMessage message="Chưa có chi nhánh nào. Bạn nhắn quản lý giúp nhé." />
            ) : (
              <BranchPicker branches={branches.data} value={branchId} onChange={setChosenBranchId} />
            ))}

          {canCapture && <CameraCapture onCapture={setPhoto} />}

          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row-reverse">
            {canCapture && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!photo || (needsBranch && branchId === "")}
                className={primaryButtonClass}
              >
                {mode === "check-out" ? "Xác nhận check out" : "Xác nhận check in"}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className={`flex min-h-12 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-strong)] ${focusClass}`}
            >
              Để sau
            </button>
          </div>
        </div>
      )}
    </section>
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="ui-eyebrow mb-2">Cỏ Ngọt · hôm nay</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          suppressHydrationWarning
          className={`ui-title w-fit rounded ${focusClass}`}
        >
          {greeting(now)}
        </h1>
        <p className="ui-lead mt-2">Một tấm ảnh, một chút vị trí — vậy là quán biết bạn đã tới.</p>
      </header>

      {outcome && (
        <div
          role={outcome.isSuccess ? "status" : undefined}
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ${
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
        <div className="ui-card rounded-[2rem]">
          <Loading label="Đang xem ca của bạn..." />
        </div>
      ) : activeMode ? (
        <AttendanceFlow key={flowKey} mode={activeMode} onCancel={handleCancel} onDone={handleDone} />
      ) : (
        <AttendanceOverview now={now} openShift={data.shift} onStart={handleStart} />
      )}

      {!activeMode && data && (
        <p className="text-center text-xs leading-5 text-[var(--muted)]">
          Giờ được ghi theo giờ Việt Nam.
        </p>
      )}
    </div>
  );
}
