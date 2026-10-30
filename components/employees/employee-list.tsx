"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { EMPLOYMENT_TYPE_LABELS, formatPhone, ROLE_LABELS } from "@/lib/employees/labels";
import type { Employee } from "@/types/employee";


export function EmployeeList() {
  const { data, error, isLoading } = useFetch<Employee[]>("/api/admin/employees");

  if (isLoading) return <Loading label="Đang tải..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption className="sr-only">Danh sách nhân viên</caption>
        <thead>
          <tr>
            {/* Paired facts share a cell as two lines, so names stop wrapping word by word on phones. */}
            <th scope="col">Nhân viên</th>
            <th scope="col" className="w-px">
              Vai trò
            </th>
            <th scope="col" className="w-px">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.map((employee) => (
            <tr key={employee.id}>
              <td className="min-w-40">
                <Link
                  href={`/admin/employees/${employee.id}`}
                  className={"ui-link"}
                >
                  {employee.fullName}
                </Link>
                <span className="mt-0.5 block text-sm text-[var(--muted)]">{formatPhone(employee.phone)}</span>
              </td>
              <td className="whitespace-nowrap">
                {ROLE_LABELS[employee.role]}
                <span className="mt-0.5 block text-sm text-[var(--muted)]">
                  {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
                </span>
              </td>
              <td className="whitespace-nowrap">
                {employee.isActive ? "Đang làm" : "Đã khoá"}
                {!employee.requiresAttendance && (
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">Không chấm công</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
