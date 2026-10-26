"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Employee } from "@/types/employee";

const buttonClass =
  "ui-btn";

type EmployeeLockControlProps = {
  employee: Employee;
  onStart: () => void;
  onChanged: () => void;
};

export function EmployeeLockControl({ employee, onStart, onChanged }: EmployeeLockControlProps) {
  const { mutate, isPending, error } = useMutation<Employee>();
  const [endDate, setEndDate] = useState("");

  async function update(body: { isActive: boolean; endDate?: string }) {
    onStart();
    try {
      await mutate(`/api/admin/employees/${employee.id}`, { method: "PATCH", body });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    <section aria-labelledby="lock-heading" className="ui-card flex max-w-2xl flex-col gap-4">
      <h2 id="lock-heading" className="ui-heading">
        Trạng thái tài khoản
      </h2>
      {employee.isActive ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employee-end-date" className="ui-label">
              Ngày nghỉ việc
            </label>
            <input
              id="employee-end-date"
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="ui-field w-fit"
            />
          </div>
          <button
            type="button"
            disabled={isPending || endDate === ""}
            onClick={() => update({ isActive: false, endDate })}
            className={buttonClass}
          >
            Khoá tài khoản
          </button>
        </>
      ) : (
        <>
          <p>Ngày nghỉ việc: {employee.endDate ?? "Chưa có"}</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => update({ isActive: true })}
            className={buttonClass}
          >
            Mở khoá
          </button>
        </>
      )}
      {error && <ErrorMessage message={error} />}
    </section>
  );
}
