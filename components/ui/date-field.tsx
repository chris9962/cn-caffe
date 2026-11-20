"use client";

import { DayPicker, type Matcher } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { PickerPopover } from "@/components/ui/picker-popover";
import { formatDate } from "@/lib/date";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Built from local parts, so the picked day never shifts across midnight in another time zone.
function toDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

type DateFieldProps = {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  clearLabel?: string;
};

export function DateField({
  label,
  hideLabel,
  value,
  onChange,
  min,
  max,
  placeholder = "Chọn ngày",
  clearLabel,
}: DateFieldProps) {
  const selected = value ? toDate(value) : undefined;
  const firstDay = min ? toDate(min) : undefined;
  const lastDay = max ? toDate(max) : undefined;
  const disabled: Matcher[] = [];
  if (firstDay) disabled.push({ before: firstDay });
  if (lastDay) disabled.push({ after: lastDay });

  return (
    <PickerPopover
      label={label}
      hideLabel={hideLabel}
      valueText={value ? formatDate(value) : ""}
      placeholder={placeholder}
    >
      {(close) => (
        <div className="flex flex-col gap-2">
          <DayPicker
            mode="single"
            locale={vi}
            selected={selected}
            defaultMonth={selected ?? lastDay}
            startMonth={firstDay}
            endMonth={lastDay}
            disabled={disabled}
            formatters={{
              formatCaption: (month: Date) => `Tháng ${month.getMonth() + 1}/${month.getFullYear()}`,
              formatWeekdayName: (weekday: Date) => WEEKDAYS[weekday.getDay()],
            }}
            onSelect={(date) => {
              if (date) onChange(toValue(date));
              close();
            }}
            className="ui-calendar"
          />
          {clearLabel && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="ui-btn-quiet min-h-10 w-full text-sm"
            >
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </PickerPopover>
  );
}
