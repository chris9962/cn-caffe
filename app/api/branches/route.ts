import { requireEmployee } from "@/app/api/_lib/auth";
import { parseCoordinateParams } from "@/app/api/_lib/branch-input";
import { dbErrorResponse } from "@/app/api/_lib/errors";
import { BRANCH_COLUMNS, toBranch } from "@/app/api/_lib/mappers";

export async function GET(request: Request) {
  const auth = await requireEmployee();
  if ("response" in auth) return auth.response;

  const coordinates = parseCoordinateParams(new URL(request.url).searchParams);
  if (coordinates instanceof Response) return coordinates;

  if (!coordinates) {
    const { data, error } = await auth.supabase
      .from("branches")
      .select(BRANCH_COLUMNS)
      .eq("is_active", true)
      .order("name");
    if (error) return dbErrorResponse(error);
    return Response.json(data.map(toBranch));
  }

  const { data, error } = await auth.supabase.rpc("branches_by_distance", {
    p_latitude: coordinates.latitude,
    p_longitude: coordinates.longitude,
  });
  if (error) return dbErrorResponse(error);
  return Response.json(data.map((row: Parameters<typeof toBranch>[0] & { distance_m: number }) => ({ ...toBranch(row), distanceM: row.distance_m })));
}
