import { requireAdmin } from "@/app/api/_lib/auth";
import { readJsonObject } from "@/app/api/_lib/employee-input";
import { errorResponse } from "@/app/api/_lib/errors";
import { parseGoogleMapsCoordinates, resolveGoogleMapsUrl } from "@/lib/branches/google-maps";

const NO_COORDINATES = "Liên kết không có toạ độ. Bạn mở Google Maps, chọn đúng chi nhánh, bấm Chia sẻ rồi sao chép liên kết.";
const UNREACHABLE = "Không mở được liên kết Google Maps. Bạn kiểm tra lại liên kết.";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body || typeof body.url !== "string") return errorResponse(400, "Dữ liệu không hợp lệ.");

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
