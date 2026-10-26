import { requireAdmin } from "@/app/api/_lib/auth";
import { parseBranchFields } from "@/app/api/_lib/branch-input";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { BRANCH_COLUMNS, toBranch } from "@/app/api/_lib/mappers";

const NOT_FOUND = "Không tìm thấy chi nhánh.";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");

  const fields = parseBranchFields(body, false);
  if (fields instanceof Response) return fields;

  const { supabase } = auth;
  const query =
    Object.keys(fields).length === 0
      ? supabase.from("branches").select(BRANCH_COLUMNS).eq("id", id)
      : supabase.from("branches").update(fields).eq("id", id).select(BRANCH_COLUMNS);
  const { data, error } = await query.maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return errorResponse(404, NOT_FOUND);

  return Response.json(toBranch(data));
}
