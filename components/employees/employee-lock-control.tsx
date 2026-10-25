"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import type { Employee } from "@/types/employee";

const buttonClass =
  "w-fit rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400 disabled:opacity-60";

type EmployeeLockControlProps = {
  employee: Employee;
  onChanged: () => void;
};

export function EmployeeLockControl({ employee, onChanged }: EmployeeLockControlProps) {
  const { mutate, isPending, error } = useMutation<Employee>();
  const [endDate, setEndDate] = useState("");

  async function update(body: { isActive: boolean; endDate?: string }) {
    try {
      await mutate(`/api/admin/employees/${employee.id}`, { method: "PATCH", body });
    } catch {
      return;
    }
    onChanged();
  }

  return (
    <section aria-labelledby="lock-heading" className="flex flex-col gap-4">
      <h2 id="lock-heading" className="text-xl font-semibold">
        Trạng thái tài khoản
      </h2>
      {employee.isActive ? (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="employee-end-date" className="font-medium">
              Ngày nghỉ việc
            </label>
            <input
              id="employee-end-date"
              type="date"
              required
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-fit rounded border border-zinc-500 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
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
