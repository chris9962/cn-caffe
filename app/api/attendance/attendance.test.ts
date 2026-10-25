import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toVietnamLocalInput } from "@/lib/date";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  cleanupFixtures,
  createTestBranch,
  createTestEmployee,
  grantManagerAccess,
  signInAs,
  signOut,
} from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { GET as mineGET } from "../shifts/mine/route";
import { POST as checkInPOST } from "./check-in/route";
import { POST as checkOutPOST } from "./check-out/route";
import { GET as currentGET } from "./current/route";

const admin = createAdminClient();

const BRANCH_LATITUDE = 10.7769;
const BRANCH_LONGITUDE = 106.7009;
const AT_BRANCH = { latitude: String(BRANCH_LATITUDE), longitude: String(BRANCH_LONGITUDE), accuracyM: "12" };
const PHOTO_ERROR = "Ảnh phải là ảnh JPEG chụp từ camera, tối đa 2 MB.";
const TWO_MB = 2 * 1024 * 1024;
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xd9];

type Fields = Record<string, string | File | undefined>;
type ShiftBody = { id: string; status: string };

const jpeg = () => new File([Uint8Array.from(JPEG_BYTES)], "a.jpg", { type: "image/jpeg" });

function formOf(fields: Fields): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(name, value);
  }
  return form;
}

const checkIn = (fields: Fields) =>
  callRoute(checkInPOST, { method: "POST", formData: formOf({ photo: jpeg(), ...fields }) });
const checkOut = (fields: Fields) =>
  callRoute(checkOutPOST, { method: "POST", formData: formOf({ photo: jpeg(), ...fields }) });
const current = () => callRoute(currentGET, {});
const mine = (query = "") => callRoute(mineGET, { url: `http://localhost/api/shifts/mine${query}` });

async function photoCount(employeeId: string): Promise<number> {
  const { data, error } = await admin.storage.from("shift-photos").list(employeeId);
  if (error) throw error;
  return data.length;
}

// The route's client loads its own copy of storage-js, so spies must go on that copy's prototype.
async function routeStorageApi() {
  return Object.getPrototypeOf((await createClient()).storage.from("shift-photos"));
}

async function signInNearBranch() {
  const branch = await createTestBranch({ latitude: BRANCH_LATITUDE, longitude: BRANCH_LONGITUDE });
  const employee = await createTestEmployee({ fullName: "Nhân Viên Ca" });
  await signInAs(employee);
  return { branch, employee };
}

beforeEach(signOut);
afterEach(() => vi.restoreAllMocks());
afterAll(cleanupFixtures);

describe("POST /api/attendance/check-in", () => {
  it("opens a shift with a signed photo URL", async () => {
    const { branch, employee } = await signInNearBranch();

    const res = await checkIn({ branchId: branch.id, ...AT_BRANCH });
    expect(res.status).toBe(201);
    const shift = await res.json();
    expect(shift).toMatchObject({
      employeeId: employee.id,
      employeeName: "Nhân Viên Ca",
      branchId: branch.id,
      branchName: "Test Branch",
      status: "open",
      source: "check_in",
      failReasons: [],
      checkOutAt: null,
      checkInLatitude: BRANCH_LATITUDE,
      checkInLongitude: BRANCH_LONGITUDE,
      checkInAccuracyM: 12,
      checkOutPhotoUrl: null,
    });
    expect(shift.checkInDistanceM).toBeLessThan(1);
    expect(shift.workDate).toBe(toVietnamLocalInput(shift.checkInAt).slice(0, 10));
    expect(shift.checkInPhotoUrl).toMatch(/^http/);

    const photo = await fetch(shift.checkInPhotoUrl);
    expect(photo.status).toBe(200);
    expect([...new Uint8Array(await photo.arrayBuffer())]).toEqual(JPEG_BYTES);
  });

  it("returns the open shift on a second check in and abandons it with startNew", async () => {
    const { branch, employee } = await signInNearBranch();
    const first = await (await checkIn({ branchId: branch.id, ...AT_BRANCH })).json();

    const again = await checkIn({ branchId: branch.id, ...AT_BRANCH });
    expect(again.status).toBe(409);
    const conflict = await again.json();
    expect(conflict.error).toBe("Bạn đang có một ca chưa check out.");
    expect(conflict.openShift.id).toBe(first.id);
    expect(conflict.openShift.checkInPhotoUrl).toMatch(/^http/);
    expect(await photoCount(employee.id)).toBe(1);

    const restarted = await checkIn({ branchId: branch.id, ...AT_BRANCH, startNew: "true" });
    expect(restarted.status).toBe(201);
    const second = await restarted.json();

    const list: ShiftBody[] = await (await mine()).json();
    expect(list.map((shift) => [shift.id, shift.status])).toEqual([
      [second.id, "open"],
      [first.id, "missing_checkout"],
    ]);
    expect(await photoCount(employee.id)).toBe(2);
  });

  it("lets only one of two simultaneous check ins succeed", async () => {
    const { branch, employee } = await signInNearBranch();

    const responses = await Promise.all([
      checkIn({ branchId: branch.id, ...AT_BRANCH }),
      checkIn({ branchId: branch.id, ...AT_BRANCH }),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await photoCount(employee.id)).toBe(1);
  });

  it("succeeds without a location and flags the shift", async () => {
    const { branch } = await signInNearBranch();

    const res = await checkIn({ branchId: branch.id });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      status: "open",
      failReasons: ["location_unavailable"],
      checkInLatitude: null,
      checkInLongitude: null,
      checkInAccuracyM: null,
      checkInDistanceM: null,
    });
  });

  it("accepts a photo of exactly 2 MB", async () => {
    const { branch } = await signInNearBranch();
    const photo = new File([new Uint8Array(TWO_MB)], "a.jpg", { type: "image/jpeg" });
    expect((await checkIn({ branchId: branch.id, ...AT_BRANCH, photo })).status).toBe(201);
  });

  it.each([
    ["a PNG", new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" })],
    ["an empty file", new File([], "a.jpg", { type: "image/jpeg" })],
    ["a file over 2 MB", new File([new Uint8Array(TWO_MB + 1)], "a.jpg", { type: "image/jpeg" })],
    ["text instead of a file", "not a file"],
    ["no photo", undefined],
  ])("rejects %s and stores nothing", async (_, photo) => {
    const { branch, employee } = await signInNearBranch();

    const res = await checkIn({ branchId: branch.id, ...AT_BRANCH, photo });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(PHOTO_ERROR);
    expect(await photoCount(employee.id)).toBe(0);
  });

  it.each([
    [{ branchId: "abc" }, "Chi nhánh không hợp lệ."],
    [{ branchId: undefined }, "Chi nhánh không hợp lệ."],
    [{ latitude: undefined }, "Toạ độ không hợp lệ."],
    [{ longitude: undefined }, "Toạ độ không hợp lệ."],
    [{ latitude: "abc" }, "Toạ độ không hợp lệ."],
    [{ latitude: "", longitude: "" }, "Toạ độ không hợp lệ."],
    [{ latitude: "95" }, "Toạ độ không hợp lệ."],
    [{ longitude: "181" }, "Toạ độ không hợp lệ."],
    [{ accuracyM: "-1" }, "Độ chính xác không hợp lệ."],
    [{ accuracyM: "abc" }, "Độ chính xác không hợp lệ."],
    [{ accuracyM: "" }, "Độ chính xác không hợp lệ."],
  ])("rejects invalid fields %# and stores nothing", async (fields: Fields, message) => {
    const { branch, employee } = await signInNearBranch();

    const res = await checkIn({ branchId: branch.id, ...AT_BRANCH, ...fields });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(message);
    expect(await photoCount(employee.id)).toBe(0);
  });

  it("rejects a body that is not multipart form data", async () => {
    const { branch } = await signInNearBranch();

    const res = await callRoute(checkInPOST, { method: "POST", json: { branchId: branch.id, ...AT_BRANCH } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Dữ liệu gửi lên không hợp lệ.");
  });

  it("returns 404 for an inactive or unknown branch and removes the uploaded photo", async () => {
    const inactive = await createTestBranch({ latitude: BRANCH_LATITUDE, longitude: BRANCH_LONGITUDE, isActive: false });
    const employee = await createTestEmployee();
    await signInAs(employee);

    for (const branchId of [inactive.id, crypto.randomUUID()]) {
      const res = await checkIn({ branchId, ...AT_BRANCH });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe("Không tìm thấy chi nhánh.");
    }
    expect(await photoCount(employee.id)).toBe(0);
  });

  it("returns 500 without opening a shift when the upload fails", async () => {
    const { branch } = await signInNearBranch();
    vi.spyOn(await routeStorageApi(), "upload").mockResolvedValue({ data: null, error: new Error("storage down") });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await checkIn({ branchId: branch.id, ...AT_BRANCH });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Có lỗi xảy ra. Bạn thử lại sau.");
    expect(consoleError).toHaveBeenCalled();
    expect(await (await current()).json()).toEqual({ shift: null });
  });

  it("still returns the shift when photo signing fails", async () => {
    const { branch } = await signInNearBranch();
    vi.spyOn(await routeStorageApi(), "createSignedUrls").mockResolvedValue({ data: null, error: new Error("no sign") });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await checkIn({ branchId: branch.id, ...AT_BRANCH });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: "open", checkInPhotoUrl: null, checkOutPhotoUrl: null });
  });

  it("rejects a locked employee with a live session before storing anything", async () => {
    const branch = await createTestBranch();
    const locked = await createTestEmployee({ isActive: false });
    await signInAs(locked);

    expect((await checkIn({ branchId: branch.id, ...AT_BRANCH })).status).toBe(401);
    expect(await photoCount(locked.id)).toBe(0);
  });
});

describe("POST /api/attendance/check-out", () => {
  it("closes the open shift and rejects a second check out", async () => {
    const { branch, employee } = await signInNearBranch();
    const opened = await (await checkIn({ branchId: branch.id, ...AT_BRANCH })).json();
    expect((await (await current()).json()).shift.id).toBe(opened.id);

    const res = await checkOut(AT_BRANCH);
    expect(res.status).toBe(200);
    const closed = await res.json();
    expect(closed).toMatchObject({
      id: opened.id,
      status: "valid",
      failReasons: [],
      checkOutLatitude: BRANCH_LATITUDE,
      checkOutLongitude: BRANCH_LONGITUDE,
      checkOutAccuracyM: 12,
    });
    expect(closed.checkOutAt).toEqual(expect.any(String));
    expect(closed.checkOutDistanceM).toBeLessThan(1);
    expect(closed.checkInPhotoUrl).toMatch(/^http/);
    expect(closed.checkOutPhotoUrl).toMatch(/^http/);

    const again = await checkOut(AT_BRANCH);
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("Bạn chưa check in.");
    expect(await photoCount(employee.id)).toBe(2);

    expect(await (await current()).json()).toEqual({ shift: null });
  });

  it("succeeds without a location and sends the shift to review", async () => {
    const { branch } = await signInNearBranch();
    await checkIn({ branchId: branch.id, ...AT_BRANCH });

    const res = await checkOut({});
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "pending_review", failReasons: ["location_unavailable"] });
  });

  it("rejects a wrong photo and invalid coordinates before storing anything", async () => {
    const { branch, employee } = await signInNearBranch();
    await checkIn({ branchId: branch.id, ...AT_BRANCH });

    const png = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" });
    const wrongPhoto = await checkOut({ ...AT_BRANCH, photo: png });
    expect(wrongPhoto.status).toBe(400);
    expect((await wrongPhoto.json()).error).toBe(PHOTO_ERROR);

    const wrongCoordinates = await checkOut({ latitude: "10.7" });
    expect(wrongCoordinates.status).toBe(400);
    expect((await wrongCoordinates.json()).error).toBe("Toạ độ không hợp lệ.");

    expect(await photoCount(employee.id)).toBe(1);
    expect((await (await current()).json()).shift.status).toBe("open");
  });
});

describe("GET /api/attendance/current and /api/shifts/mine", () => {
  it("returns no shift for an employee who has not checked in", async () => {
    await signInAs(await createTestEmployee());
    expect(await (await current()).json()).toEqual({ shift: null });
    expect(await (await mine()).json()).toEqual([]);
  });

  it("filters my shifts by month", async () => {
    const { branch } = await signInNearBranch();
    const opened = await (await checkIn({ branchId: branch.id, ...AT_BRANCH })).json();

    const thisMonth: ShiftBody[] = await (await mine(`?month=${opened.workDate.slice(0, 7)}`)).json();
    expect(thisMonth.map((shift) => shift.id)).toEqual([opened.id]);
    expect(await (await mine("?month=2000-01")).json()).toEqual([]);
  });

  it("ignores other employees' shifts that a manager can see", async () => {
    const { branch } = await signInNearBranch();
    expect((await checkIn({ branchId: branch.id, ...AT_BRANCH })).status).toBe(201);

    const manager = await createTestEmployee({ role: "manager" });
    await grantManagerAccess(manager.id, [branch.id], ["shifts.view"]);
    await signInAs(manager);

    expect(await (await current()).json()).toEqual({ shift: null });
    expect(await (await mine()).json()).toEqual([]);
  });

  it.each(["?month=bad", "?month=2026-13", "?month="])("rejects %s", async (query) => {
    await signInAs(await createTestEmployee());

    const res = await mine(query);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Tháng không hợp lệ.");
  });
});

describe("authentication", () => {
  it("requires login on every attendance route", async () => {
    expect((await checkIn({ branchId: crypto.randomUUID(), ...AT_BRANCH })).status).toBe(401);
    expect((await checkOut(AT_BRANCH)).status).toBe(401);
    expect((await current()).status).toBe(401);
    expect((await mine()).status).toBe(401);
  });
});
