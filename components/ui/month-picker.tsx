"use client";

import { useId } from "react";

type MonthPickerProps = {
  value: string;
  onChange: (month: string) => void;
};

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        Tháng
      </label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-fit rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
      />
    </div>
  );
}
