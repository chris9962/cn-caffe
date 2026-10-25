import { requireEmployee } from "@/app/api/_lib/auth";
import { findOpenShift } from "@/app/api/_lib/shifts";

export async function GET() {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;

  const open = await findOpenShift(auth.supabase, auth.employee.id);
  if ("response" in open) return open.response;
  return Response.json({ shift: open.shift });
}
