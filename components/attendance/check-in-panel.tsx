"use client";

import { useRef, useState } from "react";
import { BranchPicker } from "@/components/attendance/branch-picker";
import { CameraCapture } from "@/components/attendance/camera-capture";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { useMutation } from "@/hooks/use-mutation";
import { formatDateTime, formatTime } from "@/lib/date";
import { formatFailReasons } from "@/lib/shifts/labels";
import type { Branch, BranchWithDistance } from "@/types/branch";
import type { Shift } from "@/types/shift";

const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
// The geolocation timeout does not count time spent on the permission prompt, and some browsers never call back.
const LOCATION_GIVE_UP_MS = 20000;

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";
const primaryButtonClass = `w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white ${focusClass} disabled:opacity-60`;
const secondaryButtonClass = `w-fit rounded border border-blue-700 px-4 py-2 font-medium text-blue-700 dark:border-blue-400 dark:text-blue-400 ${focusClass}`;

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
  // A shift that was just checked in has no check out time yet.
  const done = `Đã ${action} lúc ${formatTime(shift.checkOutAt ?? shift.checkInAt)}`;
  return shift.failReasons.length === 0
    ? `${done}.`
    : `${done}, chờ quản lý duyệt: ${formatFailReasons(shift.failReasons)}.`;
}

type AttendanceFlowProps = {
  openShift: Shift | null;
  onStart: () => void;
  onCancel: () => void;
  onDone: (outcome: Outcome) => void;
};

function AttendanceFlow({ openShift, onStart, onCancel, onDone }: AttendanceFlowProps) {
  const { mutate } = useMutation<Shift>();
  const [step, setStep] = useState<Step>("idle");
  const [mode, setMode] = useState<Mode>("check-in");
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
  // Only a list sorted by distance has a sensible default; a list by name must be chosen from.
  const branchId = chosenBranchId ?? (location ? (branches.data?.[0]?.id ?? "") : "");
  const canCapture = !needsBranch || (branches.data !== null && branches.data.length > 0);

  async function handleStart(nextMode: Mode) {
    onStart();
    setMode(nextMode);
    setStep("locating");
    setLocation(await requestLocation());
    setStep("ready");
  }

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

  const progress =
    step === "locating"
      ? "Đang lấy vị trí..."
      : step === "submitting"
        ? "Đang gửi..."
        : step === "ready" && location === null
          ? "Không lấy được vị trí. Ca sẽ chờ quản lý duyệt."
          : null;

  return (
    <div className="flex flex-col gap-4">
      <p role="status">{progress}</p>
      {step === "idle" &&
        (openShift ? (
          <>
            <p>
              Bạn đang trong ca{openShift.branchName && ` tại ${openShift.branchName}`}, check in lúc{" "}
              {formatDateTime(openShift.checkInAt)}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleStart("check-out")} className={primaryButtonClass}>
                Check out
              </button>
              <button type="button" onClick={() => handleStart("start-new")} className={secondaryButtonClass}>
                Quên check out ca trước, bắt đầu ca mới
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => handleStart("check-in")} className={primaryButtonClass}>
            Check in
          </button>
        ))}
      {step === "ready" && (
        <>
          {needsBranch &&
            (branches.error ? (
              <ErrorMessage message={branches.error} />
            ) : branches.data === null ? (
              <Loading label="Đang tải chi nhánh..." />
            ) : branches.data.length === 0 ? (
              <ErrorMessage message="Chưa có chi nhánh nào. Bạn báo quản lý." />
            ) : (
              <BranchPicker branches={branches.data} value={branchId} onChange={setChosenBranchId} />
            ))}
          {canCapture && <CameraCapture onCapture={setPhoto} />}
          <div className="flex flex-wrap gap-2">
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
            <button type="button" onClick={onCancel} className={secondaryButtonClass}>
              Huỷ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CheckInPanel() {
  const { data, error, reload } = useFetch<{ shift: Shift | null }>("/api/attendance/current");
  const [flowKey, setFlowKey] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function resetFlow() {
    setFlowKey((key) => key + 1);
  }

  // The pressed button unmounts when the step changes, so focus goes to the heading, which stays mounted.
  function focusHeading() {
    headingRef.current?.focus();
  }

  function handleStart() {
    setOutcome(null);
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
    // A failed attempt may mean the open shift changed on another device, so the buttons follow the server.
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 ref={headingRef} tabIndex={-1} className={`w-fit rounded text-2xl font-semibold ${focusClass}`}>
        Check in
      </h1>
      <p role="status">{outcome?.isSuccess ? outcome.message : null}</p>
      {outcome && !outcome.isSuccess && <ErrorMessage message={outcome.message} />}
      {error ? (
        <ErrorMessage message={error} />
      ) : !data ? (
        <Loading label="Đang tải..." />
      ) : (
        <AttendanceFlow
          key={flowKey}
          openShift={data.shift}
          onStart={handleStart}
          onCancel={handleCancel}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
