import type { Employee, EmployeeRole } from "@/types/employee";

export const EMPLOYEE_COLUMNS = "id, full_name, phone, role, is_active, end_date, must_change_password";

type EmployeeRow = {
  id: string;
  full_name: string;
  phone: string;
  role: EmployeeRole;
  is_active: boolean;
  end_date: string | null;
  must_change_password: boolean;
};

export function toEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    endDate: row.end_date,
    mustChangePassword: row.must_change_password,
  };
}
