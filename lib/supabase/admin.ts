import "server-only";
import { createClient } from "@supabase/supabase-js";

// The secret key bypasses RLS, so app code uses this client only for auth.admin.* calls.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
