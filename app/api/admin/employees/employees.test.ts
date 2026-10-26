import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as changePasswordPOST } from "@/app/api/auth/change-password/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { GET as meGET } from "@/app/api/me/route";
import { cleanupFixtures, createTestEmployee, randomPhone, signInAs, signOut, trackEmployee } from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { PATCH } from "./[id]/route";
import { POST as resetPasswordPOST } from "./[id]/reset-password/route";
import { GET, POST } from "./route";

const banFailure = vi.hoisted(() => ({ enabled: false }));

vi.mock("@/lib/supabase/admin", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/supabase/admin")>();
  return {
    createAdminClient: () => {
      const client = original.createAdminClient();
      const updateUserById = client.auth.admin.updateUserById.bind(client.auth.admin);
      client.auth.admin.updateUserById = (id, attributes) =>
        banFailure.enabled && "ban_duration" in attributes
          ? Promise.resolve({ data: { user: null }, error: new Error("ban failed") } as never)
          : updateUserById(id, attributes);
      return client;
    },
  };
});

beforeEach(() => {
  banFailure.enabled = false;
  signOut();
});
afterAll(cleanupFixtures);

const login = (phone: string, password: string) =>
  callRoute(loginPOST, { method: "POST", json: { phone, password } });

const local = (phone: string) => `0${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;

async function signInAsAdmin() {
  await signInAs(await createTestEmployee({ role: "admin" }));
}

async function createViaApi(phone: string, password = "Init1234") {
  const res = await callRoute(POST, {
    method: "POST",
    json: { fullName: "Nguyễn Văn A", phone: local(phone), role: "staff", password },
  });
  if (res.status === 201) trackEmployee((await res.clone().json()).id);
  return res;
}

describe("employee admin API", () => {
  it("forbids staff", async () => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    expect((await callRoute(GET, {})).status).toBe(403);
  });

  it("lists employees", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const { id } = await (await createViaApi(phone)).json();
    const res = await callRoute(GET, {});
    expect(res.status).toBe(200);
    const list: { id: string }[] = await res.json();
    expect(list.some((e) => e.id === id)).toBe(true);
  });

  it("creates an employee who can log in", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const res = await createViaApi(phone);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.phone).toBe(phone);
    expect(body.mustChangePassword).toBe(true);
    expect(body).toMatchObject({ employmentType: "part_time", requiresAttendance: true });
    expect((await login(phone, "Init1234")).status).toBe(200);
  });

  it("stores employment type separately from attendance", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const created = await callRoute(POST, {
      method: "POST",
      json: {
        fullName: "Nhân viên toàn thời gian",
        phone: local(phone),
        role: "staff",
        employmentType: "full_time",
        requiresAttendance: false,
        password: "Init1234",
      },
    });
    expect(created.status).toBe(201);
    const employee = await created.json();
    trackEmployee(employee.id);
    expect(employee).toMatchObject({ employmentType: "full_time", requiresAttendance: false });
  });

  it("never allows admin or director to require attendance", async () => {
    await signInAsAdmin();
    const res = await callRoute(POST, {
      method: "POST",
      json: {
        fullName: "Giám đốc",
        phone: local(randomPhone()),
        role: "director",
        employmentType: "full_time",
        requiresAttendance: true,
        password: "Init1234",
      },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Admin và giám đốc không chấm công.");
  });

  it("rejects invalid input with 400", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const post = async (json: unknown) => {
      const res = await callRoute(POST, { method: "POST", json });
      return [res.status, (await res.json()).error];
    };
    const valid = { fullName: "A", phone: local(phone), role: "staff", password: "Init1234" };
    expect(await post({ ...valid, fullName: "  " })).toEqual([400, "Họ tên không được để trống."]);
    expect(await post({ ...valid, phone: "0123" })).toEqual([400, "Số điện thoại không hợp lệ."]);
    expect(await post({ ...valid, password: "short" })).toEqual([400, "Mật khẩu phải có ít nhất 8 ký tự."]);
    expect(await post({ ...valid, role: "root" })).toEqual([400, "Vai trò không hợp lệ."]);
    expect((await post(null))[0]).toBe(400);
  });

  it.each([
    ["0", (p: string) => `0${p.slice(2)}`],
    ["+84", (p: string) => `+${p}`],
    ["84", (p: string) => p],
  ])("rejects duplicate phone in %s format", async (_label, format) => {
    await signInAsAdmin();
    const phone = randomPhone();
    expect((await createViaApi(phone)).status).toBe(201);
    const res = await callRoute(POST, {
      method: "POST",
      json: { fullName: "B", phone: format(phone), role: "staff", password: "Init1234" },
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Số điện thoại đã được dùng.");
  });

  it("locks and unlocks an employee", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const { id } = await (await createViaApi(phone)).json();

    const lock = await callRoute(PATCH, {
      method: "PATCH",
      params: { id },
      json: { isActive: false, endDate: "2026-10-31" },
    });
    expect(lock.status).toBe(200);
    expect(await lock.json()).toMatchObject({ isActive: false, endDate: "2026-10-31" });
    expect((await login(phone, "Init1234")).status).toBe(401);

    const unlock = await callRoute(PATCH, { method: "PATCH", params: { id }, json: { isActive: true } });
    expect(unlock.status).toBe(200);
    expect((await login(phone, "Init1234")).status).toBe(200);
  });

  it("restores the row when the ban call fails", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const { id } = await (await createViaApi(phone)).json();

    banFailure.enabled = true;
    const res = await callRoute(PATCH, {
      method: "PATCH",
      params: { id },
      json: { isActive: false, endDate: "2026-10-31", fullName: "Đổi tên" },
    });
    banFailure.enabled = false;
    expect(res.status).toBe(500);

    const list: { id: string; isActive: boolean; endDate: string | null; fullName: string }[] =
      await (await callRoute(GET, {})).json();
    expect(list.find((e) => e.id === id)).toMatchObject({
      isActive: true,
      endDate: null,
      fullName: "Nguyễn Văn A",
    });
    expect((await login(phone, "Init1234")).status).toBe(200);
  });

  it("changes the phone used to log in", async () => {
    await signInAsAdmin();
    const oldPhone = randomPhone();
    const newPhone = randomPhone();
    const { id } = await (await createViaApi(oldPhone)).json();

    const res = await callRoute(PATCH, {
      method: "PATCH",
      params: { id },
      json: { phone: local(newPhone), fullName: "Trần Thị B", role: "manager" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ phone: newPhone, fullName: "Trần Thị B", role: "manager" });
    expect((await login(newPhone, "Init1234")).status).toBe(200);
    expect((await login(oldPhone, "Init1234")).status).toBe(401);
  });

  it("rejects a bad PATCH", async () => {
    await signInAsAdmin();
    const { id } = await (await createViaApi(randomPhone())).json();
    const patch = async (json: unknown, targetId = id) => {
      const res = await callRoute(PATCH, { method: "PATCH", params: { id: targetId }, json });
      return [res.status, (await res.json()).error];
    };
    expect(await patch({ endDate: "31/10/2026" })).toEqual([400, "Ngày nghỉ việc không hợp lệ."]);
    expect(await patch({ endDate: "2026-13-45" })).toEqual([400, "Ngày nghỉ việc không hợp lệ."]);
    expect(await patch({ endDate: "2026-02-30" })).toEqual([400, "Ngày nghỉ việc không hợp lệ."]);
    expect(await patch({ role: "root" })).toEqual([400, "Vai trò không hợp lệ."]);
    expect(await patch({ employmentType: "freelance" })).toEqual([
      400,
      "Hình thức làm việc không hợp lệ.",
    ]);
    expect(await patch({ fullName: "" })).toEqual([400, "Họ tên không được để trống."]);
    expect(await patch({ phone: "12" })).toEqual([400, "Số điện thoại không hợp lệ."]);
    expect((await patch(null))[0]).toBe(400);
    expect(await patch({ fullName: "X" }, crypto.randomUUID())).toEqual([404, "Không tìm thấy nhân viên."]);
  });

  it("rejects a PATCH phone that another employee uses", async () => {
    await signInAsAdmin();
    const other = randomPhone();
    await createViaApi(other);
    const { id } = await (await createViaApi(randomPhone())).json();
    const res = await callRoute(PATCH, { method: "PATCH", params: { id }, json: { phone: other } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Số điện thoại đã được dùng.");
  });

  it("resets the password", async () => {
    await signInAsAdmin();
    const phone = randomPhone();
    const { id } = await (await createViaApi(phone)).json();
    await signInAs({ phone, password: "Init1234" });
    await callRoute(changePasswordPOST, {
      method: "POST",
      json: { password: "Changed1234" },
    });
    expect((await (await callRoute(meGET, {})).json()).mustChangePassword).toBe(false);

    await signInAsAdmin();
    const res = await callRoute(resetPasswordPOST, {
      method: "POST",
      params: { id },
      json: { password: "Reset1234" },
    });
    expect(res.status).toBe(200);

    expect((await login(phone, "Reset1234")).status).toBe(200);
    expect((await (await callRoute(meGET, {})).json()).mustChangePassword).toBe(true);
  });

  it("validates reset-password", async () => {
    await signInAsAdmin();
    const short = await callRoute(resetPasswordPOST, { method: "POST", params: { id: crypto.randomUUID() }, json: { password: "x" } });
    expect(short.status).toBe(400);
    const missing = await callRoute(resetPasswordPOST, { method: "POST", params: { id: crypto.randomUUID() }, json: { password: "Reset1234" } });
    expect(missing.status).toBe(404);
  });
});
