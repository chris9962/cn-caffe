export type EmployeeRole = "admin" | "director" | "manager" | "staff";

export type ManagerPermission = "shifts.view" | "shifts.review" | "shifts.edit";

export type Employee = {
  id: string;
  fullName: string;
  phone: string;
  role: EmployeeRole;
  isActive: boolean;
  endDate: string | null;
  mustChangePassword: boolean;
};

export type CurrentUser = Employee & {
  managerBranchIds: string[];
  permissions: ManagerPermission[];
};
