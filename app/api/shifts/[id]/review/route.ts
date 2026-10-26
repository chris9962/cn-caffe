import { requireEmployee } from "@/app/api/_lib/auth";
import { isUuid, readJsonObject } from "@/app/api/_lib/employee-input";
import { dbErrorResponse, errorResponse } from "@/app/api/_lib/errors";
import { invalidBodyResponse } from "@/app/api/_lib/shift-input";
import { shiftResponse } from "@/app/api/_lib/shifts";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;
  const { supabase } = auth;

  const { id } = await params;
  if (!isUuid(id)) return errorResponse(404, "Không tìm thấy ca.");

  const body = await readJsonObject(request);
  if (!body) return invalidBodyResponse();
  const { decision } = body;
  if (decision !== "approve" && decision !== "reject") return errorResponse(400, "Thao tác không hợp lệ.");

  const { error } = await supabase.rpc("review_shift", { p_shift_id: id, p_decision: decision });
  if (error) return dbErrorResponse(error);

  return shiftResponse(supabase, id);
}
