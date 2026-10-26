import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { PERMISSION_LABELS } from "@/lib/employees/permission-labels";
import type { ManagerPermission } from "@/types/employee";

const NOT_FOUND = "Không tìm thấy nhân viên.";
const INVALID = "Dữ liệu gửi lên không hợp lệ.";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && isUuid(item));

const isPermissionArray = (value: unknown): value is ManagerPermission[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && Object.hasOwn(PERMISSION_LABELS, item));

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const { supabase } = auth;
  const [branches, permissions] = await Promise.all([
    supabase.from("manager_branches").select("branch_id").eq("manager_id", id),
    supabase.from("manager_permissions").select("permission").eq("manager_id", id),
  ]);
  if (branches.error) return dbErrorResponse(branches.error);
  if (permissions.error) return dbErrorResponse(permissions.error);

  return Response.json({
    branchIds: branches.data.map((row) => row.branch_id),
    permissions: permissions.data.map((row) => row.permission as ManagerPermission),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const body = await readJsonObject(request);
  if (!body || !isStringArray(body.branchIds) || !isPermissionArray(body.permissions)) {
    return errorResponse(400, INVALID);
  }

  const { error } = await auth.supabase.rpc("set_manager_access", {
    p_manager_id: id,
    p_branch_ids: body.branchIds,
    p_permissions: body.permissions,
  });
  if (error) return dbErrorResponse(error);

  return Response.json({ branchIds: body.branchIds, permissions: body.permissions });
}
