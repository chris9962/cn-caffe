import type { Branch } from "@/types/branch";
import type { Employee, EmployeeRole, EmploymentType } from "@/types/employee";
import type { PayAdjustment, PayRate } from "@/types/payroll";
import type { AuditLog, FailReason, Shift, ShiftStatus } from "@/types/shift";

export const EMPLOYEE_COLUMNS =
  "id, full_name, phone, role, employment_type, requires_attendance, is_active, end_date, must_change_password";

type EmployeeRow = {
  id: string;
  full_name: string;
  phone: string;
  role: EmployeeRole;
  employment_type: EmploymentType;
  requires_attendance: boolean;
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
    employmentType: row.employment_type,
    requiresAttendance: row.requires_attendance,
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

// Untyped postgrest-js types these many-to-one embeds as arrays, so queries use overrideTypes<ShiftRow>.
export const SHIFT_COLUMNS = `id, employee_id, branch_id, work_date, status, source, check_in_at, check_out_at,
  check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_distance_m, check_in_photo_path,
  check_out_latitude, check_out_longitude, check_out_accuracy_m, check_out_distance_m, check_out_photo_path,
  fail_reasons, branches(name), employees(full_name)`;

export type ShiftRow = {
  id: string;
  employee_id: string;
  branch_id: string;
  work_date: string;
  status: ShiftStatus;
  source: "check_in" | "manual";
  check_in_at: string;
  check_out_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy_m: number | null;
  check_in_distance_m: number | null;
  check_in_photo_path: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_m: number | null;
  check_out_distance_m: number | null;
  check_out_photo_path: string | null;
  fail_reasons: FailReason[];
  branches: { name: string } | null;
  employees: { full_name: string } | null;
};

export function toShift(
  row: ShiftRow,
  photoUrls: { checkIn: string | null; checkOut: string | null },
): Shift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employees?.full_name ?? "",
    branchId: row.branch_id,
    // RLS hides inactive branches from staff, so the embed is null for a shift at a branch closed later.
    branchName: row.branches?.name ?? "",
    workDate: row.work_date,
    status: row.status,
    source: row.source,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    checkInDistanceM: row.check_in_distance_m,
    checkInAccuracyM: row.check_in_accuracy_m,
    checkOutDistanceM: row.check_out_distance_m,
    checkOutAccuracyM: row.check_out_accuracy_m,
    checkInLatitude: row.check_in_latitude,
    checkInLongitude: row.check_in_longitude,
    checkOutLatitude: row.check_out_latitude,
    checkOutLongitude: row.check_out_longitude,
    failReasons: row.fail_reasons,
    checkInPhotoUrl: photoUrls.checkIn,
    checkOutPhotoUrl: photoUrls.checkOut,
  };
}

type AuditLogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  created_at: string;
  before: unknown;
  after: unknown;
};

export function toAuditLog(row: AuditLogRow, actorNames: Map<string, string>): AuditLog {
  return {
    id: row.id,
    actorName: row.actor_id === null ? null : (actorNames.get(row.actor_id) ?? null),
    action: row.action,
    createdAt: row.created_at,
    before: row.before,
    after: row.after,
  };
}

export const PAY_RATE_COLUMNS = "id, employment_type, amount, effective_from";

type PayRateRow = { id: string; employment_type: EmploymentType; amount: number; effective_from: string };

export function toPayRate(row: PayRateRow): PayRate {
  return { id: row.id, employmentType: row.employment_type, amount: row.amount, effectiveFrom: row.effective_from };
}

export const PAY_ADJUSTMENT_COLUMNS = "id, employee_id, month, amount, note, created_at, employees(full_name)";

// Untyped postgrest-js types the employees embed as an array, so queries use overrideTypes<PayAdjustmentRow>.
export type PayAdjustmentRow = {
  id: string;
  employee_id: string;
  month: string;
  amount: number;
  note: string;
  created_at: string;
  employees: { full_name: string } | null;
};

export function toPayAdjustment(row: PayAdjustmentRow): PayAdjustment {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employees?.full_name ?? "",
    month: row.month.slice(0, 7),
    amount: row.amount,
    note: row.note,
    createdAt: row.created_at,
  };
}
