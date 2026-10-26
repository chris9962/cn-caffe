import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/types/employee";
import { dbErrorResponse, errorResponse } from "./errors";
import { EMPLOYEE_COLUMNS, toEmployee } from "./mappers";

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type AuthResult = { supabase: ServerClient; employee: Employee } | { response: Response };

export async function requireEmployee(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { response: errorResponse(401, "Bạn cần đăng nhập.") };

  // Locking does not revoke tokens, so a locked employee still has valid claims; their row decides.
  const { data: row, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) return { response: dbErrorResponse(error) };
  if (!row?.is_active) return { response: errorResponse(401, "Bạn cần đăng nhập.") };

  return { supabase, employee: toEmployee(row) };
}

export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireEmployee();
  if ("response" in auth) return auth;
  if (auth.employee.role !== "admin" && auth.employee.role !== "director") {
    return { response: errorResponse(403, "Bạn không có quyền thực hiện thao tác này.") };
  }
  return auth;
}

export async function requireAttendanceEmployee(): Promise<AuthResult> {
  const auth = await requireEmployee();
  if ("response" in auth) return auth;
  if (!auth.employee.requiresAttendance) {
    return { response: errorResponse(403, "Tài khoản này không cần chấm công.") };
  }
  return auth;
}
