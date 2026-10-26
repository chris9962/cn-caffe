import { errorResponse } from "@/app/api/_lib/errors";
import { normalizePhone, phoneToEmail } from "@/lib/auth/phone";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { phone, password } = await request.json().catch(() => ({}));
  const normalizedPhone = typeof phone === "string" ? normalizePhone(phone) : null;
  if (!normalizedPhone) return errorResponse(400, "Số điện thoại không hợp lệ.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(normalizedPhone),
    password,
  });
  if (error) {
    // Wrong password and banned (locked) users both land here; the log tells them apart from an Auth outage.
    console.error(error);
    return errorResponse(401, "Số điện thoại hoặc mật khẩu không đúng.");
  }

  return Response.json({ ok: true });
}
