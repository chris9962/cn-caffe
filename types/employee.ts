export type EmployeeRole = "admin" | "director" | "manager" | "staff";
export type EmploymentType = "full_time" | "part_time";

export type ManagerPermission = "shifts.view" | "shifts.review" | "shifts.edit" | "payroll.view";

export type Employee = {
  id: string;
  fullName: string;
  phone: string;
  role: EmployeeRole;
  employmentType: EmploymentType;
  requiresAttendance: boolean;
  isActive: boolean;
  endDate: string | null;
  mustChangePassword: boolean;
};

export type CurrentUser = Employee & {
  managerBranchIds: string[];
  permissions: ManagerPermission[];
};
