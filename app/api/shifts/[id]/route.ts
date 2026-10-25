import { requireEmployee } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { toAuditLog } from "@/app/api/_lib/mappers";
import { invalidBodyResponse, parseInstant } from "@/app/api/_lib/shift-input";
import { findShiftById, shiftResponse } from "@/app/api/_lib/shifts";

type Context = { params: Promise<{ id: string }> };

const notFound = () => errorResponse(404, "Không tìm thấy ca.");

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const shift = await findShiftById(supabase, id);
  if (shift instanceof Response) return shift;
  if (!shift) return notFound();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, created_at, before, after")
    .eq("table_name", "shifts")
    .eq("row_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) return dbErrorResponse(error);

  const actorIds = [...new Set(logs.flatMap((log) => (log.actor_id ? [log.actor_id] : [])))];
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorError } = await supabase
      .from("employees")
      .select("id, full_name")
      .in("id", actorIds);
    if (actorError) return dbErrorResponse(actorError);
    for (const actor of actors) actorNames.set(actor.id, actor.full_name);
  }

  return Response.json({ shift, auditLogs: logs.map((log) => toAuditLog(log, actorNames)) });
}

export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const body = await readJsonObject(request);
  if (!body) return invalidBodyResponse();
  const checkInAt = parseInstant(body.checkInAt);
  if (checkInAt instanceof Response) return checkInAt;
  const checkOutAt = parseInstant(body.checkOutAt);
  if (checkOutAt instanceof Response) return checkOutAt;

  const { error } = await supabase.rpc("edit_shift_times", {
    p_shift_id: id,
    p_check_in_at: checkInAt,
    p_check_out_at: checkOutAt,
  });
  if (error) return dbErrorResponse(error);

  return shiftResponse(supabase, id);
}
