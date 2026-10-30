import { requireEmployee } from "@/app/api/_lib/auth";
import { loadCurrentUser } from "@/app/api/_lib/current-user";

export async function GET() {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;

  const currentUser = await loadCurrentUser(auth.supabase, auth.employee);
  if (currentUser instanceof Response) return currentUser;
  return Response.json(currentUser);
}
