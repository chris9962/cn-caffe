"use client";

import { useId, useState, type FormEvent } from "react";
import { MISSING_TIMES_MESSAGE, ShiftTimeFields, type ShiftTimes } from "@/components/shifts/shift-time-fields";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import { toVietnamIso, toVietnamLocalInput } from "@/lib/date";
import type { Shift } from "@/types/shift";

type ShiftTimeFormProps = {
  shift: Shift;
  onStart: () => void;
  onSaved: () => void;
};

export function ShiftTimeForm({ shift, onStart, onSaved }: ShiftTimeFormProps) {
  const { mutate, isPending, error } = useMutation<Shift>();
  const [times, setTimes] = useState<ShiftTimes>({
    checkIn: toVietnamLocalInput(shift.checkInAt),
    checkOut: shift.checkOutAt ? toVietnamLocalInput(shift.checkOutAt) : "",
  });
  const [inputError, setInputError] = useState<string | null>(null);
  const headingId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onStart();
    // toVietnamIso does not validate, so an empty input would reach the API as a malformed time.
    if (times.checkIn === "" || times.checkOut === "") {
      setInputError(MISSING_TIMES_MESSAGE);
      return;
    }
    setInputError(null);
    try {
      await mutate(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        body: { checkInAt: toVietnamIso(times.checkIn), checkOutAt: toVietnamIso(times.checkOut) },
      });
    } catch {
      return;
    }
    onSaved();
  }

  const message = inputError ?? error;

  return (
    // noValidate: Chrome blocks a half-filled datetime-local with an English bubble; the check below says it in Vietnamese.
    <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-xl font-semibold">
        Sửa giờ
      </h2>
      <ShiftTimeFields value={times} onChange={setTimes} />
      {message && <ErrorMessage message={message} />}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400 disabled:opacity-60"
      >
        Lưu giờ
      </button>
    </form>
  );
}
