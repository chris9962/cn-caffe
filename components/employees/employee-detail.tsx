"use client";

import { use, useState } from "react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeLockControl } from "@/components/employees/employee-lock-control";
import { ResetPasswordForm } from "@/components/employees/reset-password-form";
import { ManagerAccessForm } from "@/components/managers/manager-access-form";
import { PayRateSection } from "@/components/payroll/pay-rate-section";
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

  function clearSaved() {
    setSaved(false);
  }

  // The API has no single-employee endpoint, so the list response is the source.
  const employee = data?.find((item) => item.id === id);

  return (
    <div className="flex flex-col gap-8">
            <div role="status" className="ui-saved">{saved ? "Đã lưu." : null}</div>
      {error ? (
        <ErrorMessage message={error} />
      ) : data === null && isLoading ? (
        <Loading label="Đang tải..." />
      ) : !employee ? (
        <ErrorMessage message="Không tìm thấy nhân viên." />
      ) : (
        <>
          <h1 className="ui-title">{employee.fullName}</h1>
          <EmployeeForm key={employee.id} employee={employee} onStart={clearSaved} onSaved={handleSaved} />
          <PayRateSection key={`${employee.id}-pay`} employee={employee} />
          <EmployeeLockControl
            key={`${employee.id}-${employee.isActive}`}
            employee={employee}
            onStart={clearSaved}
            onChanged={reload}
          />
          <ResetPasswordForm key={`${employee.id}-reset`} employeeId={employee.id} />
          {employee.role === "manager" && <ManagerAccessForm key={`${employee.id}-access`}managerId={employee.id} />}
        </>
      )}
    </div>
  );
}
