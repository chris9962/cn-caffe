import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";

const NOT_FOUND = "Không tìm thấy mức lương.";

// Closed months keep their stored payslips, so removing a rate only changes months that are still open.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; rateId: string }> },
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id, rateId } = await params;
  if (!isUuid(id) || !isUuid(rateId)) return errorResponse(404, NOT_FOUND);

  const { data, error } = await auth.supabase
    .from("pay_rates")
    .delete()
    .eq("id", rateId)
    .eq("employee_id", id)
    .select("id")
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return errorResponse(404, NOT_FOUND);

  return new Response(null, { status: 204 });
}
