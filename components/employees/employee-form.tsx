"use client";

import { useState, type FormEvent } from "react";
import { ErrorMessage } from "@/components/ui/error-message";
import { useMutation } from "@/hooks/use-mutation";
import {
  EMPLOYMENT_TYPE_LABELS,
  formatPhone,
  ROLE_LABELS,
} from "@/lib/employees/labels";
import type { Employee, EmployeeRole, EmploymentType } from "@/types/employee";

const inputClass =
  "ui-field";

type EmployeeFormProps = {
  employee?: Employee;
  onStart?: () => void;
  onSaved: (employee: Employee) => void;
};

export function EmployeeForm({ employee, onStart, onSaved }: EmployeeFormProps) {
  const { mutate, isPending, error } = useMutation<Employee>();
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [phone, setPhone] = useState(employee ? formatPhone(employee.phone) : "");
  const [role, setRole] = useState<EmployeeRole>(employee?.role ?? "staff");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    employee?.employmentType ?? "part_time",
  );
  const [requiresAttendance, setRequiresAttendance] = useState(
    employee?.requiresAttendance ?? true,
  );
  const [password, setPassword] = useState("");
  const attendanceLocked = role === "admin" || role === "director";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onStart?.();
    let result: Employee;
    try {
      result = employee
        ? await mutate(`/api/admin/employees/${employee.id}`, {
            method: "PATCH",
            body: {
              fullName,
              phone,
              role,
              employmentType,
              requiresAttendance: attendanceLocked ? false : requiresAttendance,
            },
          })
        : await mutate("/api/admin/employees", {
            method: "POST",
            body: {
              fullName,
              phone,
              role,
              employmentType,
              requiresAttendance: attendanceLocked ? false : requiresAttendance,
              password,
            },
          });
    } catch {
      return;
    }
    onSaved(result);
  }

  return (
    <form onSubmit={handleSubmit} className="ui-card flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-full-name" className="ui-label">
          Họ tên
        </label>
        <input
          id="employee-full-name"
          type="text"
          autoComplete="off"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-phone" className="ui-label">
          Số điện thoại
        </label>
        <input
          id="employee-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-role" className="ui-label">
          Vai trò
        </label>
        <select
          id="employee-role"
          value={role}
          onChange={(event) => {
            const nextRole = event.target.value as EmployeeRole;
            setRole(nextRole);
            if (nextRole === "admin" || nextRole === "director") {
              setRequiresAttendance(false);
            }
          }}
          className={inputClass}
        >
          {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-employment-type" className="ui-label">
          Hình thức làm việc
        </label>
        <select
          id="employee-employment-type"
          value={employmentType}
          onChange={(event) => setEmploymentType(event.target.value as EmploymentType)}
          className={inputClass}
        >
          {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((value) => (
            <option key={value} value={value}>
              {EMPLOYMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="ui-hint">
          Hình thức làm việc dùng để xác định cách tính lương, không quyết định việc chấm công.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={!attendanceLocked && requiresAttendance}
            disabled={attendanceLocked}
            onChange={(event) => setRequiresAttendance(event.target.checked)}
            className="mt-1 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="block font-semibold">Cần chấm công</span>
            <span className="block ui-hint">
              {attendanceLocked
                ? "Admin và giám đốc không chấm công."
                : "Bật để nhân viên dùng Chấm công và Ca của tôi."}
            </span>
          </span>
        </label>
      </div>
      {!employee && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="employee-password" className="ui-label">
            Mật khẩu ban đầu
          </label>
          <input
            id="employee-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </div>
      )}
      {error && <ErrorMessage message={error} />}
      <button
        type="submit"
        disabled={isPending}
        className="ui-btn"
      >
        {employee ? "Lưu" : "Tạo nhân viên"}
      </button>
    </form>
  );
}
