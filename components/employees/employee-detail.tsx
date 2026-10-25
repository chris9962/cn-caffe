"use client";

import { use, useState } from "react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeLockControl } from "@/components/employees/employee-lock-control";
import { ResetPasswordForm } from "@/components/employees/reset-password-form";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import type { Employee } from "@/types/employee";

export function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading, reload } = useFetch<Employee[]>("/api/admin/employees");
  const [saved, setSaved] = useState(false);

  function handleSaved() {
    setSaved(true);
    reload();
  }

  // The API has no single-employee endpoint, so the list response is the source.
  const employee = data?.find((item) => item.id === id);

  return (
    <div className="flex flex-col gap-8">
      {/* Outside the loading branch: reload() unmounts the form, which would drop the message. */}
      <div role="status">{saved ? "Đã lưu." : null}</div>
      {isLoading ? (
        <Loading label="Đang tải..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : !employee ? (
        <ErrorMessage message="Không tìm thấy nhân viên." />
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
          <EmployeeForm key={employee.id} employee={employee} onSaved={handleSaved} />
          <EmployeeLockControl
            key={`${employee.id}-${employee.isActive}`}
            employee={employee}
            onChanged={reload}
          />
          <ResetPasswordForm key={`${employee.id}-reset`} employeeId={employee.id} />
          {/* Task 11 mounts <ManagerAccessForm managerId={employee.id} /> here. */}
          {employee.role === "manager" && null}
        </>
      )}
    </div>
  );
}
