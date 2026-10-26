"use client";

import { useRouter } from "next/navigation";
import { EmployeeForm } from "@/components/employees/employee-form";

export function EmployeeCreate() {
  const router = useRouter();
  return <EmployeeForm onSaved={() => router.push("/admin/employees")} />;
}
