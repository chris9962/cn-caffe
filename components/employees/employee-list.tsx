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
            <th scope="col">Họ tên</th>
            <th scope="col">Số điện thoại</th>
            <th scope="col">Vai trò</th>
            <th scope="col">Hình thức</th>
            <th scope="col">Chấm công</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((employee) => (
            <tr key={employee.id}>
              <td>
                <Link
                  href={`/admin/employees/${employee.id}`}
                  className={"ui-link"}
                >
                  {employee.fullName}
                </Link>
              </td>
              <td>{formatPhone(employee.phone)}</td>
              <td>{ROLE_LABELS[employee.role]}</td>
              <td>{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</td>
              <td>{employee.requiresAttendance ? "Có" : "Không"}</td>
              <td>{employee.isActive ? "Đang làm" : "Đã khoá"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
