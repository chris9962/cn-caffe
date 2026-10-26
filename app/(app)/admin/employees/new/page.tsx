import type { Metadata } from "next";
import { EmployeeCreate } from "@/components/employees/employee-create";

export const metadata: Metadata = { title: "Thêm nhân viên" };

export default function NewEmployeePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="ui-title">Thêm nhân viên</h1>
      <EmployeeCreate />
    </div>
  );
}
