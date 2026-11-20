"use client";

import { useId } from "react";
import { DateField } from "@/components/ui/date-field";
import { TimeField } from "@/components/ui/time-field";
import { toVietnamLocalInput } from "@/lib/date";

export const MISSING_TIMES_MESSAGE = "Giờ vào và giờ ra là bắt buộc.";

export type ShiftTimes = { checkIn: string; checkOut: string };

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// A value may hold only its date or only its time while the user is still filling it in.
export function hasBothTimes(times: ShiftTimes) {
  return DATE_TIME.test(times.checkIn) && DATE_TIME.test(times.checkOut);
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

function joinDateTime(date: string, time: string) {
  return date === "" && time === "" ? "" : `${date}T${time}`;
}

type DateTimeFieldsProps = {
  legend: string;
  value: string;
  max: string;
  onChange: (value: string) => void;
};

function DateTimeFields({ legend, value, max, onChange }: DateTimeFieldsProps) {
  const timeId = useId();
  const { date, time } = splitDateTime(value);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="ui-label mb-1.5">{legend}</legend>
      <div className="flex flex-wrap items-end gap-2">
        <DateField label="Ngày" hideLabel value={date} max={max} onChange={(next) => onChange(joinDateTime(next, time))} />
        <TimeField id={timeId} label="Giờ" value={time} onChange={(next) => onChange(joinDateTime(date, next))} />
      </div>
    </fieldset>
  );
}

type ShiftTimeFieldsProps = {
  value: ShiftTimes;
  onChange: (value: ShiftTimes) => void;
};

export function ShiftTimeFields({ value, onChange }: ShiftTimeFieldsProps) {
  const today = toVietnamLocalInput(new Date().toISOString()).slice(0, 10);
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      <DateTimeFields legend="Giờ vào" value={value.checkIn} max={today} onChange={(checkIn) => onChange({ ...value, checkIn })} />
      <DateTimeFields legend="Giờ ra" value={value.checkOut} max={today} onChange={(checkOut) => onChange({ ...value, checkOut })} />
    </div>
  );
}
