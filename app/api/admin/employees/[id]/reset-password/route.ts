import { requireAdmin } from "@/app/api/_lib/auth";
import { isUuid, parsePassword, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body) return errorResponse(400, "Dữ liệu không hợp lệ.");
  const password = parsePassword(body.password);
  if (password instanceof Response) return password;
  if (!isUuid(id)) return errorResponse(404, "Không tìm thấy nhân viên.");

  const { data, error } = await auth.supabase
    .from("employees")
    .update({ must_change_password: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return errorResponse(404, "Không tìm thấy nhân viên.");

  const { error: passwordError } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (passwordError) {
    console.error(passwordError);
    return errorResponse(500, "Có lỗi xảy ra. Bạn thử lại sau.");
  }

  return Response.json({ ok: true });
}
