import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { currentMonth } from "@/lib/date";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupFixtures,
  createTestBranch,
  createTestEmployee,
  grantManagerAccess,
  signInAs,
  signOut,
} from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { GET as employeesGET } from "../employees/route";
import { POST as reviewPOST } from "./[id]/review/route";
import { GET as detailGET, PATCH as detailPATCH } from "./[id]/route";
import { GET as listGET, POST as manualPOST } from "./route";

const admin = createAdminClient();
const month = currentMonth();
const at = (time: string) => `${month}-01T${time}:00+07:00`;
const NOT_FOUND_ID = "00000000-0000-4000-8000-000000000000";

type Person = { id: string; phone: string; password: string };
let staff: Person;
let manager: Person;
let viewer: Person;
let branch1: { id: string };
let branch2: { id: string };
let pendingShiftId: string;
let otherBranchShiftId: string;

async function insertShift(values: Record<string, unknown>): Promise<string> {
  const { data } = await admin
    .from("shifts")
    .insert({
      employee_id: staff.id,
      work_date: `${month}-01`,
      source: "check_in",
      created_by: staff.id,
      ...values,
    })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

const list = (query = "") => callRoute(listGET, { url: `http://localhost/api/shifts${query}` });
const detail = (id: string) => callRoute(detailGET, { params: { id } });
const review = (id: string, json: unknown) => callRoute(reviewPOST, { method: "POST", json, params: { id } });
const edit = (id: string, json: unknown) => callRoute(detailPATCH, { method: "PATCH", json, params: { id } });
const manual = (json: unknown) => callRoute(manualPOST, { method: "POST", json });

beforeAll(async () => {
  branch1 = await createTestBranch();
  branch2 = await createTestBranch();
  staff = await createTestEmployee({ fullName: "Nhân Viên Ca" });
  manager = await createTestEmployee({ role: "manager", fullName: "Quản Lý Đủ Quyền" });
  viewer = await createTestEmployee({ role: "manager", fullName: "Quản Lý Chỉ Xem" });
  await grantManagerAccess(manager.id, [branch1.id], ["shifts.view", "shifts.review", "shifts.edit"]);
  await grantManagerAccess(viewer.id, [branch1.id], ["shifts.view"]);

  const photoPath = `${staff.id}/checkin.jpg`;
  const upload = await admin.storage
    .from("shift-photos")
    .upload(photoPath, Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg" });
  if (upload.error) throw upload.error;

  pendingShiftId = await insertShift({
    branch_id: branch1.id,
    status: "pending_review",
    check_in_at: at("02:00"),
    check_out_at: at("04:00"),
    check_in_distance_m: 5000,
    check_in_photo_path: photoPath,
    fail_reasons: ["outside_radius"],
  });
  otherBranchShiftId = await insertShift({
    branch_id: branch2.id,
    status: "valid",
    check_in_at: at("06:00"),
    check_out_at: at("08:00"),
  });
});

beforeEach(signOut);
afterAll(cleanupFixtures);

describe("GET /api/shifts", () => {
  it("lists only shifts of branches the manager can view, with signed photo URLs", async () => {
    await signInAs(manager);
    const res = await list(`?month=${month}`);
    expect(res.status).toBe(200);
    const shifts: { id: string; checkInPhotoUrl: string | null }[] = await res.json();
    expect(shifts.map((shift) => shift.id)).toEqual([pendingShiftId]);
    expect(shifts[0].checkInPhotoUrl).toMatch(/^http/);
  });

  it("filters by status", async () => {
    await signInAs(manager);
    const kept = await (await list(`?month=${month}&status=pending_review`)).json();
    expect(kept).toHaveLength(1);
    const dropped = await (await list(`?month=${month}&status=valid`)).json();
    expect(dropped).toHaveLength(0);
  });

  it("rejects bad filters", async () => {
    await signInAs(manager);
    const badMonth = await list("?month=2026-13");
    expect(badMonth.status).toBe(400);
    expect(await badMonth.json()).toEqual({ error: "Tháng không hợp lệ." });
    const badStatus = await list("?status=nope");
    expect(badStatus.status).toBe(400);
    expect(await badStatus.json()).toEqual({ error: "Bộ lọc không hợp lệ." });
    expect((await list("?branchId=abc")).status).toBe(400);
  });

  it("requires login", async () => {
    expect((await list()).status).toBe(401);
  });
});

describe("GET /api/shifts/[id]", () => {
  it("returns the shift and its audit logs", async () => {
    await signInAs(manager);
    const res = await detail(pendingShiftId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shift.id).toBe(pendingShiftId);
    expect(Array.isArray(body.auditLogs)).toBe(true);
  });

  it("returns 404 for a shift the caller cannot see or a malformed id", async () => {
    await signInAs(manager);
    const res = await detail(otherBranchShiftId);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Không tìm thấy ca." });
    expect((await detail("not-a-uuid")).status).toBe(404);
    expect((await detail(NOT_FOUND_ID)).status).toBe(404);
  });
});

describe("POST /api/shifts/[id]/review", () => {
  it("rejects an invalid decision", async () => {
    await signInAs(manager);
    const res = await review(pendingShiftId, { decision: "maybe" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Thao tác không hợp lệ." });
  });

  it("forbids a manager without shifts.review", async () => {
    await signInAs(viewer);
    expect((await review(pendingShiftId, { decision: "approve" })).status).toBe(403);
  });

  it("approves once and then refuses the repeat, leaving an audit log", async () => {
    await signInAs(manager);
    const res = await review(pendingShiftId, { decision: "approve" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: pendingShiftId, status: "valid", branchName: "Test Branch" });

    const again = await review(pendingShiftId, { decision: "approve" });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "Trạng thái của ca không cho phép thao tác này." });

    const body = await (await detail(pendingShiftId)).json();
    expect(body.auditLogs).toHaveLength(1);
    expect(body.auditLogs[0]).toMatchObject({ action: "shift.approved", actorName: "Quản Lý Đủ Quyền" });
  });
});

describe("PATCH /api/shifts/[id]", () => {
  it("rejects check out before check in", async () => {
    await signInAs(manager);
    const res = await edit(pendingShiftId, { checkInAt: at("04:00"), checkOutAt: at("02:00") });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Giờ check out phải sau giờ check in." });
  });

  it("rejects times without an offset", async () => {
    await signInAs(manager);
    const res = await edit(pendingShiftId, { checkInAt: `${month}-01T02:00:00`, checkOutAt: at("04:00") });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Thời gian không hợp lệ." });
  });

  it("rejects a date that does not exist", async () => {
    await signInAs(manager);
    const res = await edit(pendingShiftId, { checkInAt: at("02:00"), checkOutAt: "2026-02-30T10:00:00+07:00" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Thời gian không hợp lệ." });
  });

  it("rejects a non-object body", async () => {
    await signInAs(manager);
    const res = await edit(pendingShiftId, null);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ." });
  });

  it("edits times", async () => {
    await signInAs(manager);
    const res = await edit(pendingShiftId, { checkInAt: at("02:30"), checkOutAt: at("04:00") });
    expect(res.status).toBe(200);
    const shift = await res.json();
    expect(shift.id).toBe(pendingShiftId);
    expect(Date.parse(shift.checkInAt)).toBe(Date.parse(at("02:30")));
  });
});

describe("POST /api/shifts", () => {
  it("rejects an overlapping manual shift", async () => {
    await signInAs(manager);
    const res = await manual({ employeeId: staff.id, branchId: branch1.id, checkInAt: at("03:00"), checkOutAt: at("05:00") });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Ca này trùng giờ với một ca khác của nhân viên." });
  });

  it("creates a non-overlapping manual shift", async () => {
    await signInAs(manager);
    const res = await manual({ employeeId: staff.id, branchId: branch1.id, checkInAt: at("15:00"), checkOutAt: at("16:00") });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ source: "manual", employeeId: staff.id });
  });

  it("rejects a manual shift on a date that does not exist", async () => {
    await signInAs(manager);
    const res = await manual({
      employeeId: staff.id,
      branchId: branch1.id,
      checkInAt: "2026-04-31T08:00:00+07:00",
      checkOutAt: at("19:00"),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Thời gian không hợp lệ." });
  });

  it("returns 404 for a missing employee or branch and 400 for bad ids", async () => {
    await signInAs(manager);
    const times = { checkInAt: at("18:00"), checkOutAt: at("19:00") };
    const noEmployee = await manual({ employeeId: NOT_FOUND_ID, branchId: branch1.id, ...times });
    expect(noEmployee.status).toBe(404);
    expect(await noEmployee.json()).toEqual({ error: "Không tìm thấy nhân viên." });
    const noBranch = await manual({ employeeId: staff.id, branchId: NOT_FOUND_ID, ...times });
    expect(noBranch.status).toBe(404);
    expect(await noBranch.json()).toEqual({ error: "Không tìm thấy chi nhánh." });
    const badId = await manual({ employeeId: "x", branchId: branch1.id, ...times });
    expect(badId.status).toBe(400);
    expect(await badId.json()).toEqual({ error: "Dữ liệu gửi lên không hợp lệ." });
  });
});

describe("GET /api/employees", () => {
  it("lets a manager see active employees", async () => {
    await signInAs(manager);
    const res = await callRoute(employeesGET);
    expect(res.status).toBe(200);
    const people: { id: string; fullName: string }[] = await res.json();
    expect(people).toContainEqual({ id: staff.id, fullName: "Nhân Viên Ca" });
  });

  it("shows staff only themselves", async () => {
    await signInAs(staff);
    const people = await (await callRoute(employeesGET)).json();
    expect(people).toEqual([{ id: staff.id, fullName: "Nhân Viên Ca" }]);
  });
});
