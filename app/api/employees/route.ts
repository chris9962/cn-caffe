import { requireEmployee } from "@/app/api/_lib/auth";
import { dbErrorResponse } from "@/app/api/_lib/errors";

export async function GET() {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("employees")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");
  if (error) return dbErrorResponse(error);

  return Response.json(data.map((row) => ({ id: row.id, fullName: row.full_name })));
}
