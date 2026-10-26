import type { Metadata } from "next";
import Link from "next/link";
import { EmployeeList } from "@/components/employees/employee-list";

export const metadata: Metadata = { title: "Nhân viên" };

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="ui-title">Nhân viên</h1>
        <Link
          href="/admin/employees/new"
          className="ui-btn"
        >
          Thêm nhân viên
        </Link>
      </div>
      <EmployeeList />
    </div>
  );
}
