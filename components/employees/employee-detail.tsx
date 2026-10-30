"use client";

import { use, useState } from "react";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeLockControl } from "@/components/employees/employee-lock-control";
import { ResetPasswordForm } from "@/components/employees/reset-password-form";
import { ManagerAccessForm } from "@/components/managers/manager-access-form";
import { PayRateSection } from "@/components/payroll/pay-rate-section";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, ROLE_LABELS } from "@/lib/employees/labels";
import type { Employee } from "@/types/employee";

type AccountAction = "reset-password" | "lock";

const actionButtonClass = "min-h-10 px-4 text-sm";

export function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, isLoading, reload } = useFetch<Employee[]>("/api/admin/employees");
  const showToast = useToast();
  const [openAction, setOpenAction] = useState<AccountAction | null>(null);

  function handleSaved() {
    showToast("Đã lưu thông tin.");
    reload();
  }

  function handleLockChanged(message: string) {
    setOpenAction(null);
    showToast(message);
    reload();
  }

  // The API has no single-employee endpoint, so the list response is the source.
  const employee = data?.find((item) => item.id === id);

  if (error) return <ErrorMessage message={error} />;
  if (data === null && isLoading) return <Loading label="Đang tải..." />;
  if (!employee) return <ErrorMessage message="Không tìm thấy nhân viên." />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="ui-title">{employee.fullName}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
            <span>{ROLE_LABELS[employee.role]}</span>
            <span aria-hidden="true">·</span>
            <span>{formatPhone(employee.phone)}</span>
            <span
              className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                employee.isActive
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--danger-soft)] text-[var(--danger)]"
              }`}
            >
              {employee.isActive ? "Đang làm" : "Đã khoá"}
            </span>
          </p>
        </div>
        {/* Rare account actions open a modal instead of each taking a card on the page. */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpenAction("reset-password")}
            className={`ui-btn-quiet ${actionButtonClass}`}
          >
            Đặt lại mật khẩu
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpenAction("lock")}
            className={`${employee.isActive ? "ui-btn-danger" : "ui-btn-quiet"} ${actionButtonClass}`}
          >
            {employee.isActive ? "Khoá tài khoản" : "Mở khoá"}
          </button>
        </div>
      </header>

      <Tabs
        label="Hồ sơ nhân viên"
        tabs={[
          {
            id: "info",
            label: "Thông tin",
            content: <EmployeeForm key={employee.id} employee={employee} onSaved={handleSaved} />,
          },
          { id: "pay", label: "Mức lương", content: <PayRateSection key={`${employee.id}-pay`} employee={employee} /> },
          ...(employee.role === "manager"
            ? [
                {
                  id: "access",
                  label: "Phân quyền",
                  content: <ManagerAccessForm key={`${employee.id}-access`} managerId={employee.id} />,
                },
              ]
            : []),
        ]}
      />

      <Modal open={openAction === "reset-password"} title="Đặt lại mật khẩu" onClose={() => setOpenAction(null)}>
        {/* Mounted only while open, so a typed password never lingers after the modal closes. */}
        {openAction === "reset-password" && (
          <ResetPasswordForm employeeId={employee.id} onDone={() => setOpenAction(null)} />
        )}
      </Modal>
      <Modal
        open={openAction === "lock"}
        title={employee.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
        onClose={() => setOpenAction(null)}
      >
        {openAction === "lock" && <EmployeeLockControl employee={employee} onChanged={handleLockChanged} />}
      </Modal>
    </div>
  );
}
