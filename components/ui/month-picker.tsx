"use client";

import { useId } from "react";

type MonthPickerProps = {
  value: string;
  onChange: (month: string) => void;
  // In a page toolbar the field already shows the month, so a visible label only adds height.
  hideLabel?: boolean;
};

export function MonthPicker({ value, onChange, hideLabel = false }: MonthPickerProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "ui-label"}>
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
