import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";

const NOT_FOUND = "Không tìm thấy khoản cộng trừ.";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, NOT_FOUND);

  const { data, error } = await auth.supabase.from("pay_adjustments").delete().eq("id", id).select("id").maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return errorResponse(404, NOT_FOUND);

  return new Response(null, { status: 204 });
}
