import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse } from "@/app/api/_lib/errors";
import type { CurrentUser } from "@/types/employee";

export async function GET() {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase, employee } = auth;

  // Admins can read every manager's rows, so filter to the caller explicitly.
  const [branches, permissions] = await Promise.all([
    supabase.from("manager_branches").select("branch_id").eq("manager_id", employee.id),
    supabase.from("manager_permissions").select("permission").eq("manager_id", employee.id),
  ]);
  if (branches.error) return dbErrorResponse(branches.error);
  if (permissions.error) return dbErrorResponse(permissions.error);

  const currentUser: CurrentUser = {
    ...employee,
    managerBranchIds: branches.data.map((row) => row.branch_id),
    permissions: permissions.data.map((row) => row.permission),
  };
  return Response.json(currentUser);
}
