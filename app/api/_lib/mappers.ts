import type { Branch } from "@/types/branch";
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

export const BRANCH_COLUMNS = "id, name, address, google_maps_url, latitude, longitude, radius_m, is_active";

type BranchRow = {
  id: string;
  name: string;
  address: string;
  google_maps_url: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  is_active: boolean;
};

export function toBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    googleMapsUrl: row.google_maps_url,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusM: row.radius_m,
    isActive: row.is_active,
  };
}
