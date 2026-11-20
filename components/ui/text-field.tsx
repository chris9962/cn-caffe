import type { ComponentProps } from "react";
import { ErrorMessage } from "@/components/ui/error-message";

type TextFieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ id, label, hint, error, required, ...inputProps }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="ui-label">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[var(--danger)]">
            *
          </span>
        )}
      </label>
      <input
        {...inputProps}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="ui-field"
      />
      {hint && (
        <p id={hintId} className="ui-hint">
          {hint}
        </p>
      )}
      {error && <ErrorMessage id={errorId} message={error} />}
    </div>
  );
}
