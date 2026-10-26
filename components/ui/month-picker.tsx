"use client";

import { useId } from "react";

type MonthPickerProps = {
  value: string;
  onChange: (month: string) => void;
};

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="ui-label">
        Tháng
      </label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ui-field w-fit"
      />
    </div>
  );
}
