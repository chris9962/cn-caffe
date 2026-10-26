import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";

export async function POST(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const { password } = await request.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < 8) {
    return errorResponse(400, "Mật khẩu phải có ít nhất 8 ký tự.");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  // Auth rejects reusing the current password, which a first-login employee is likely to try.
  if (updateError?.code === "same_password") {
    return errorResponse(400, "Mật khẩu mới phải khác mật khẩu hiện tại.");
  }
  if (updateError) return dbErrorResponse(updateError);

  const { error } = await supabase.rpc("mark_password_changed");
  if (error) return dbErrorResponse(error);

  return Response.json({ ok: true });
}
