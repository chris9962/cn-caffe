import { createClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToEmail } from "../lib/auth/phone.ts";

const [phoneInput, password, fullName] = process.argv.slice(2);
const phone = phoneInput ? normalizePhone(phoneInput) : null;

if (!phone || !password || password.length < 8 || !fullName?.trim()) {
  console.error('Usage: npm run admin:create -- <phone> <password, 8+ characters> "<full name>"');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase.auth.admin.createUser({
  email: phoneToEmail(phone),
  password,
  email_confirm: true,
});
if (error) {
  console.error(`Could not create the Auth user: ${error.message}`);
  process.exit(1);
}

const { error: insertError } = await supabase.from("employees").insert({
  id: data.user.id,
  full_name: fullName.trim(),
  phone,
  role: "admin",
  must_change_password: false,
});
if (insertError) {
  // An Auth user without an employees row can log in but every API call returns 401, so remove it.
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error(`Could not create the employee: ${insertError.message}`);
  process.exit(1);
}

console.log(`Created admin "${fullName.trim()}" with phone ${phone}.`);
