import { requireAdmin } from "@/app/api/_lib/auth";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { errorResponse } from "@/app/api/_lib/errors";
import { parseGoogleMapsCoordinates, resolveGoogleMapsUrl } from "@/lib/branches/google-maps";

const NO_COORDINATES = "Link không có toạ độ. Bạn mở Google Maps, chọn đúng quán, bấm Chia sẻ rồi copy link.";
const UNREACHABLE = "Không mở được link Google Maps. Bạn kiểm tra lại link.";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body || typeof body.url !== "string") return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");

  let resolvedUrl: string;
  try {
    resolvedUrl = await resolveGoogleMapsUrl(body.url.trim());
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_map_link") return errorResponse(400, NO_COORDINATES);
    console.error(error);
    return errorResponse(400, UNREACHABLE);
  }

  const coordinates = parseGoogleMapsCoordinates(resolvedUrl);
  if (!coordinates) return errorResponse(400, NO_COORDINATES);

  return Response.json({ ...coordinates, resolvedUrl });
}
