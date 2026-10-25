import Link from "next/link";
import { EmployeeList } from "@/components/employees/employee-list";

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Nhân viên</h1>
        <Link
          href="/admin/employees/new"
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
        >
          Thêm nhân viên
        </Link>
      </div>
      <EmployeeList />
    </div>
  );
}
