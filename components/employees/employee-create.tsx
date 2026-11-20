"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmployeeForm } from "@/components/employees/employee-form";

export function EmployeeCreate() {
  const router = useRouter();
  // Next keeps this page alive after leaving it, so a new key empties the form for the next employee.
  const [formKey, setFormKey] = useState(0);
  return (
    <EmployeeForm
      key={formKey}
      onSaved={() => {
        setFormKey((key) => key + 1);
        router.push("/admin/employees");
      }}
    />
  );
}
