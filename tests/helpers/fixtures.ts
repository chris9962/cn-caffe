import { randomInt } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { phoneToEmail } from "@/lib/auth/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmployeeRole, EmploymentType, ManagerPermission } from "@/types/employee";
import { cookieJar } from "./cookie-jar";

const admin = createAdminClient();
const createdEmployeeIds: string[] = [];
const createdBranchIds: string[] = [];

export function randomPhone(): string {
  return `84${randomInt(1e9).toString().padStart(9, "0")}`;
}

export function trackEmployee(id: string): void {
  createdEmployeeIds.push(id);
}

export function trackBranch(id: string): void {
  createdBranchIds.push(id);
}

export async function createTestEmployee(
  opts: {
    role?: EmployeeRole;
    password?: string;
    fullName?: string;
    isActive?: boolean;
    employmentType?: EmploymentType;
    requiresAttendance?: boolean;
  } = {},
): Promise<{ id: string; phone: string; password: string }> {
  const phone = randomPhone();
  const password = opts.password ?? "Test1234";

  const { data, error } = await admin.auth.admin.createUser({
    email: phoneToEmail(phone),
    password,
    email_confirm: true,
  });
  if (error) throw error;
  createdEmployeeIds.push(data.user.id);

  const role = opts.role ?? "staff";
  await admin
    .from("employees")
    .insert({
      id: data.user.id,
      full_name: opts.fullName ?? "Test Employee",
      phone,
      role,
      employment_type: opts.employmentType ?? "part_time",
      requires_attendance:
        opts.requiresAttendance ?? (role !== "admin" && role !== "director"),
      // Only the row is locked, not the Auth user, so signInAs still works for a locked employee's live session.
      is_active: opts.isActive ?? true,
    })
    .throwOnError();

  return { id: data.user.id, phone, password };
}

export async function createTestBranch(
  opts: { latitude?: number; longitude?: number; radiusM?: number; isActive?: boolean } = {},
): Promise<{ id: string }> {
  const { data } = await admin
    .from("branches")
    .insert({
      name: "Test Branch",
      latitude: opts.latitude ?? 10.7769,
      longitude: opts.longitude ?? 106.7009,
      radius_m: opts.radiusM ?? 100,
      is_active: opts.isActive ?? true,
    })
    .select("id")
    .single()
    .throwOnError();
  createdBranchIds.push(data.id);

  return { id: data.id };
}

export async function grantManagerAccess(
  managerId: string,
  branchIds: string[],
  permissions: ManagerPermission[],
): Promise<void> {
  await admin
    .from("manager_branches")
    .insert(branchIds.map((branchId) => ({ manager_id: managerId, branch_id: branchId })))
    .throwOnError();
  await admin
    .from("manager_permissions")
    .insert(permissions.map((permission) => ({ manager_id: managerId, permission })))
    .throwOnError();
}

// Closed months refuse shift and adjustment deletes, so a test that closes a month reopens it here first.
export async function cleanupPayrollMonth(monthDate: string): Promise<void> {
  await admin.from("payroll_versions").delete().eq("month", monthDate).throwOnError();
  await admin.from("payroll_periods").delete().eq("month", monthDate).throwOnError();
  await admin.from("monthly_configs").delete().eq("month", monthDate).throwOnError();
  await admin.from("audit_logs").delete().eq("row_id", monthDate).throwOnError();
}

// Deletes children before parents because shifts and manager rows reference employees and branches.
export async function cleanupFixtures(): Promise<void> {
  const employeeIds = createdEmployeeIds.splice(0);
  const branchIds = createdBranchIds.splice(0);
  const photos = admin.storage.from("shift-photos");

  for (const employeeId of employeeIds) {
    const { data: files, error } = await photos.list(employeeId, { limit: 1000 });
    if (error) throw error;
    if (files.length === 0) continue;
    const removed = await photos.remove(files.map((file) => `${employeeId}/${file.name}`));
    if (removed.error) throw removed.error;
  }

  const { data: shifts } = await admin
    .from("shifts")
    .select("id")
    .in("employee_id", employeeIds)
    .throwOnError();
  const auditRowIds = [...employeeIds, ...shifts.map((shift) => shift.id)];

  await admin.from("audit_logs").delete().in("actor_id", employeeIds).throwOnError();
  await admin.from("audit_logs").delete().in("row_id", auditRowIds).throwOnError();
  await admin.from("shifts").delete().in("employee_id", employeeIds).throwOnError();
  await admin.from("payslips").delete().in("employee_id", employeeIds).throwOnError();
  await admin.from("pay_adjustments").delete().in("employee_id", employeeIds).throwOnError();
  await admin.from("pay_rates").delete().in("employee_id", employeeIds).throwOnError();
  await admin.from("manager_branches").delete().in("manager_id", employeeIds).throwOnError();
  await admin.from("manager_permissions").delete().in("manager_id", employeeIds).throwOnError();
  await admin.from("employees").delete().in("id", employeeIds).throwOnError();
  await admin.from("branches").delete().in("id", branchIds).throwOnError();

  for (const employeeId of employeeIds) {
    const { error } = await admin.auth.admin.deleteUser(employeeId);
    if (error) throw error;
  }
}

export async function signInAs(user: { phone: string; password: string }): Promise<void> {
  signOut();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieJar.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => cookieJar.set(name, value, options)),
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(user.phone),
    password: user.password,
  });
  if (error) throw error;
}

export function signOut(): void {
  cookieJar.clear();
}
