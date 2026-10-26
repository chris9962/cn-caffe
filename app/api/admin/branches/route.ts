import { requireAdmin } from "@/app/api/_lib/auth";
import { parseBranchFields } from "@/app/api/_lib/branch-input";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { BRANCH_COLUMNS, toBranch } from "@/app/api/_lib/mappers";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase.from("branches").select(BRANCH_COLUMNS).order("name");
  if (error) return dbErrorResponse(error);

  return Response.json(data.map(toBranch));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");

  const fields = parseBranchFields(body, true);
  if (fields instanceof Response) return fields;

  const { data, error } = await auth.supabase.from("branches").insert(fields as never).select(BRANCH_COLUMNS).single();
  if (error) return dbErrorResponse(error);

  return Response.json(toBranch(data), { status: 201 });
}
