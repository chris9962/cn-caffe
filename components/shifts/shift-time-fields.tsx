"use client";

import { useId } from "react";
import { toVietnamLocalInput } from "@/lib/date";

const inputClass =
  "ui-field w-fit";

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-check-in`} className="ui-label">
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
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-check-out`} className="ui-label">
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
