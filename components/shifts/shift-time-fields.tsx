"use client";

import { useId } from "react";
import { toVietnamLocalInput } from "@/lib/date";

const inputClass =
  "w-fit rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

export const MISSING_TIMES_MESSAGE = "Bạn nhập đủ giờ vào và giờ ra.";

export type ShiftTimes = { checkIn: string; checkOut: string };

type ShiftTimeFieldsProps = {
  value: ShiftTimes;
  onChange: (value: ShiftTimes) => void;
};

export function ShiftTimeFields({ value, onChange }: ShiftTimeFieldsProps) {
  const id = useId();
  const max = toVietnamLocalInput(new Date().toISOString());
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-check-in`} className="font-medium">
          Giờ vào
        </label>
        <input
          id={`${id}-check-in`}
          type="datetime-local"
          max={max}
          value={value.checkIn}
          onChange={(event) => onChange({ ...value, checkIn: event.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-check-out`} className="font-medium">
          Giờ ra
        </label>
        <input
          id={`${id}-check-out`}
          type="datetime-local"
          max={max}
          value={value.checkOut}
          onChange={(event) => onChange({ ...value, checkOut: event.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
}
