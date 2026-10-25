"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/ui/error-message";
import { Loading } from "@/components/ui/loading";
import { useFetch } from "@/hooks/use-fetch";
import { formatPhone, ROLE_LABELS } from "@/lib/employees/labels";
import type { Employee } from "@/types/employee";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400";

export function EmployeeList() {
  const { data, error, isLoading } = useFetch<Employee[]>("/api/admin/employees");

  if (isLoading) return <Loading label="Đang tải..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Danh sách nhân viên</caption>
        <thead>
          <tr className="border-b border-zinc-300">
            <th scope="col" className="p-2">Họ tên</th>
            <th scope="col" className="p-2">Số điện thoại</th>
            <th scope="col" className="p-2">Vai trò</th>
            <th scope="col" className="p-2">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((employee) => (
            <tr key={employee.id} className="border-b border-zinc-200">
              <td className="p-2">
                <Link
                  href={`/admin/employees/${employee.id}`}
                  className={`rounded underline ${focusClass}`}
                >
                  {employee.fullName}
                </Link>
              </td>
              <td className="p-2">{formatPhone(employee.phone)}</td>
              <td className="p-2">{ROLE_LABELS[employee.role]}</td>
              <td className="p-2">{employee.isActive ? "Đang làm" : "Đã khoá"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
