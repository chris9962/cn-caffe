import type { CurrentUser, Employee } from "@/types/employee";
import type { ServerClient } from "./auth";
import { dbErrorResponse } from "./errors";

export async function loadCurrentUser(supabase: ServerClient, employee: Employee): Promise<CurrentUser | Response> {
  // Admins can read every manager's rows, so filter to the caller explicitly.
  const [branches, permissions] = await Promise.all([
    supabase.from("manager_branches").select("branch_id").eq("manager_id", employee.id),
    supabase.from("manager_permissions").select("permission").eq("manager_id", employee.id),
  ]);
  if (branches.error) return dbErrorResponse(branches.error);
  if (permissions.error) return dbErrorResponse(permissions.error);

  return {
    ...employee,
    managerBranchIds: branches.data.map((row) => row.branch_id),
    permissions: permissions.data.map((row) => row.permission),
  };
}
