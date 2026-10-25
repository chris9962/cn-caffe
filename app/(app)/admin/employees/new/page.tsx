import { EmployeeCreate } from "@/components/employees/employee-create";

export default function NewEmployeePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Thêm nhân viên</h1>
      <EmployeeCreate />
    </div>
  );
}
