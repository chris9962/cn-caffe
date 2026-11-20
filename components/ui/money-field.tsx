"use client";

import type { ChangeEvent, ComponentProps } from "react";
import { formatAmount } from "@/lib/payroll/format";

type MoneyFieldProps = Omit<ComponentProps<"input">, "type" | "inputMode" | "value" | "onChange"> & {
  value: string;
  onChange: (digits: string) => void;
};

function formatDigits(digits: string) {
  return digits === "" ? "" : formatAmount(Number(digits));
}

function countDigits(text: string) {
  return text.replace(/\D/g, "").length;
}

function caretAfterDigits(text: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index]) && ++seen === digitCount) return index + 1;
  }
  return text.length;
}

// Shows a whole-dong amount with thousands separators while the user types; `value` holds digits only.
export function MoneyField({ value, onChange, ...inputProps }: MoneyFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const typed = input.value;
    let digits = typed.replace(/\D/g, "");
    let digitsBeforeCaret = countDigits(typed.slice(0, input.selectionStart ?? typed.length));

    // Deleting a separator leaves the digits unchanged, so delete the digit next to it instead.
    const { inputType } = event.nativeEvent as InputEvent;
    if (digits === value && inputType === "deleteContentBackward" && digitsBeforeCaret > 0) {
      digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret);
      digitsBeforeCaret -= 1;
    } else if (digits === value && inputType === "deleteContentForward") {
      digits = digits.slice(0, digitsBeforeCaret) + digits.slice(digitsBeforeCaret + 1);
    }

    const withoutLeadingZeros = digits.replace(/^0+(?=\d)/, "");
    digitsBeforeCaret -= digits.length - withoutLeadingZeros.length;

    // Writing the formatted text here keeps the caret where it was; React then sees no change to restore.
    const formatted = formatDigits(withoutLeadingZeros);
    input.value = formatted;
    const caret = caretAfterDigits(formatted, digitsBeforeCaret);
    input.setSelectionRange(caret, caret);
    onChange(withoutLeadingZeros);
  }

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatDigits(value)}
      onChange={handleChange}
    />
  );
}
