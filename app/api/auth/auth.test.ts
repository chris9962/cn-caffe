import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { requireAdmin } from "@/app/api/_lib/auth";
import { POST as changePasswordPOST } from "@/app/api/auth/change-password/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as meGET } from "@/app/api/me/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookieJar } from "@/tests/helpers/cookie-jar";
import {
  cleanupFixtures,
  createTestBranch,
  createTestEmployee,
  grantManagerAccess,
  signInAs,
  signOut,
} from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";

const hasSessionCookie = () => cookieJar.getAll().some((c) => c.name.startsWith("sb-"));

beforeEach(signOut);
afterAll(cleanupFixtures);

describe("POST /api/auth/login", () => {
  it("logs in with any phone format", async () => {
    const user = await createTestEmployee({ password: "Init1234" });
    const local = "0" + user.phone.slice(2);
    const res = await callRoute(loginPOST, {
      method: "POST",
      json: { phone: local.replace(/(\d{4})(\d{3})/, "$1 $2 "), password: "Init1234" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(hasSessionCookie()).toBe(true);
  });

  it("rejects a wrong password with 401", async () => {
    const user = await createTestEmployee({ password: "Init1234" });
    const res = await callRoute(loginPOST, {
      method: "POST",
      json: { phone: user.phone, password: "Wrong1234" },
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Số điện thoại hoặc mật khẩu không đúng.");
    expect(hasSessionCookie()).toBe(false);
  });

  it("rejects an invalid phone with 400", async () => {
    const res = await callRoute(loginPOST, {
      method: "POST",
      json: { phone: "0123", password: "Init1234" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Số điện thoại không hợp lệ.");
  });
});

describe("GET /api/me", () => {
  it("returns the current user", async () => {
    const user = await createTestEmployee({ fullName: "Nguyễn Văn A" });
    await signInAs(user);
    const res = await callRoute(meGET, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: user.id,
      fullName: "Nguyễn Văn A",
      phone: user.phone,
      role: "staff",
      employmentType: "part_time",
      requiresAttendance: true,
      isActive: true,
      endDate: null,
      mustChangePassword: true,
      managerBranchIds: [],
      permissions: [],
    });
  });

  it("returns the manager's branches and permissions", async () => {
    const manager = await createTestEmployee({ role: "manager" });
    const branch = await createTestBranch();
    await grantManagerAccess(manager.id, [branch.id], ["shifts.view", "shifts.review"]);
    await signInAs(manager);
    const body = await (await callRoute(meGET, {})).json();
    expect(body.role).toBe("manager");
    expect(body.managerBranchIds).toEqual([branch.id]);
    expect([...body.permissions].sort()).toEqual(["shifts.review", "shifts.view"]);
  });

  it("returns 401 without a session", async () => {
    signOut();
    const res = await callRoute(meGET, {});
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Bạn cần đăng nhập.");
  });

  it("returns 401 for a locked employee with a valid session", async () => {
    const user = await createTestEmployee();
    await signInAs(user);
    expect((await callRoute(meGET, {})).status).toBe(200);

    const { error } = await createAdminClient()
      .from("employees")
      .update({ is_active: false })
      .eq("id", user.id);
    expect(error).toBeNull();

    const res = await callRoute(meGET, {});
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Bạn cần đăng nhập.");
  });
});

describe("POST /api/auth/change-password", () => {
  it("changes the password and clears the flag", async () => {
    const user = await createTestEmployee({ password: "Init1234" });
    await signInAs(user);
    const res = await callRoute(changePasswordPOST, {
      method: "POST",
      json: { password: "NewPass123" },
    });
    expect(res.status).toBe(200);
    expect((await (await callRoute(meGET, {})).json()).mustChangePassword).toBe(false);

    await signInAs({ phone: user.phone, password: "NewPass123" });
    expect((await callRoute(meGET, {})).status).toBe(200);
  });

  it("rejects a short password", async () => {
    const user = await createTestEmployee();
    await signInAs(user);
    const res = await callRoute(changePasswordPOST, {
      method: "POST",
      json: { password: "short" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Mật khẩu phải có ít nhất 8 ký tự.");
  });

  it("rejects the current password", async () => {
    const user = await createTestEmployee({ password: "Init1234" });
    await signInAs(user);
    const res = await callRoute(changePasswordPOST, {
      method: "POST",
      json: { password: "Init1234" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Mật khẩu mới phải khác mật khẩu hiện tại.");
  });

  it("returns 401 without a session", async () => {
    const res = await callRoute(changePasswordPOST, {
      method: "POST",
      json: { password: "NewPass123" },
    });
    expect(res.status).toBe(401);
  });
});

describe("requireAdmin", () => {
  it("forbids staff with 403", async () => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    const result = await requireAdmin();
    expect("response" in result && result.response.status).toBe(403);
  });

  it("allows a director", async () => {
    await signInAs(await createTestEmployee({ role: "director" }));
    const result = await requireAdmin();
    expect("employee" in result && result.employee.role).toBe("director");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session", async () => {
    const user = await createTestEmployee();
    await signInAs(user);
    const res = await callRoute(logoutPOST, { method: "POST" });
    expect(res.status).toBe(200);
    expect(hasSessionCookie()).toBe(false);
    expect((await callRoute(meGET, {})).status).toBe(401);
  });
});
