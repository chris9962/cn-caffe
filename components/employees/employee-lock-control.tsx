"use client";

import { useState } from "react";
import { DateField } from "@/components/ui/date-field";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import { formatDate } from "@/lib/date";
import type { Employee } from "@/types/employee";

type EmployeeLockControlProps = {
  employee: Employee;
  onChanged: (message: string) => void;
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
    onChanged(body.isActive ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản.");
  }

  return (
    <div className="flex flex-col gap-5">
      {employee.isActive ? (
        <>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Nhân viên bị khoá không đăng nhập được. Các ca đã có vẫn giữ nguyên.
          </p>
          <DateField label="Ngày nghỉ việc" value={endDate} onChange={setEndDate} />
          {error && <ErrorMessage message={error} />}
          <button
            type="button"
            disabled={isPending || endDate === ""}
            onClick={() => update({ isActive: false, endDate })}
            className="ui-btn-danger w-full"
          >
            Khoá tài khoản
          </button>
        </>
      ) : (
        <>
          <p className="text-sm leading-6">
            Ngày nghỉ việc: {employee.endDate ? formatDate(employee.endDate) : "Chưa có"}. Sau khi mở khoá, nhân viên đăng
            nhập lại được.
          </p>
          {error && <ErrorMessage message={error} />}
          <button type="button" disabled={isPending} onClick={() => update({ isActive: true })} className="ui-btn w-full">
            Mở khoá
          </button>
        </>
      )}
    </div>
  );
}
