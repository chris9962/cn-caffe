// A Map, not an object literal, so a database message like "constructor" can't hit a prototype key.
const DB_ERRORS = new Map<string, { status: number; message: string }>([
  ["42501", { status: 403, message: "Bạn không có quyền thực hiện thao tác này." }],
  ["open_shift_exists", { status: 409, message: "Bạn đang có một ca chưa check out." }],
  ["no_open_shift", { status: 409, message: "Bạn chưa check in." }],
  ["invalid_photo", { status: 400, message: "Ảnh không hợp lệ." }],
  ["branch_not_found", { status: 404, message: "Không tìm thấy chi nhánh." }],
  ["invalid_status", { status: 409, message: "Trạng thái của ca không cho phép thao tác này." }],
  ["invalid_times", { status: 400, message: "Giờ check out phải sau giờ check in." }],
  ["future_times", { status: 400, message: "Giờ vào và giờ ra không được ở tương lai." }],
  ["overlap", { status: 409, message: "Ca này trùng giờ với một ca khác của nhân viên." }],
  ["not_a_manager", { status: 400, message: "Nhân viên này không có vai trò quản lý." }],
  ["invalid_decision", { status: 400, message: "Thao tác không hợp lệ." }],
]);

export function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

export function dbErrorResponse(error: { code?: string; message: string }): Response {
  const known = DB_ERRORS.get(error.code ?? "") ?? DB_ERRORS.get(error.message);
  if (known) return errorResponse(known.status, known.message);

  console.error(error);
  return errorResponse(500, "Có lỗi xảy ra. Bạn thử lại sau.");
}
