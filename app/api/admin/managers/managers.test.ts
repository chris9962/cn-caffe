import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as meGET } from "@/app/api/me/route";
import { cleanupFixtures, createTestBranch, createTestEmployee, signInAs, signOut } from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { GET, PUT } from "./[id]/access/route";

beforeEach(signOut);
afterAll(cleanupFixtures);

const put = (id: string, json: unknown) => callRoute(PUT, { method: "PUT", params: { id }, json });

describe("manager access API", () => {
  it("sets and reads branches and permissions", async () => {
    const manager = await createTestEmployee({ role: "manager" });
    const branch = await createTestBranch();
    await signInAs(await createTestEmployee({ role: "admin" }));

    const body = { branchIds: [branch.id], permissions: ["shifts.view", "shifts.review"] };
    expect((await put(manager.id, body)).status).toBe(200);

    const res = await callRoute(GET, { params: { id: manager.id } });
    expect(res.status).toBe(200);
    const access = await res.json();
    expect(access.branchIds).toEqual([branch.id]);
    expect([...access.permissions].sort()).toEqual(["shifts.review", "shifts.view"]);

    await signInAs(manager);
    const me = await (await callRoute(meGET, {})).json();
    expect(me.managerBranchIds).toEqual([branch.id]);
    expect([...me.permissions].sort()).toEqual(["shifts.review", "shifts.view"]);
  });

  it("replaces the previous access", async () => {
    const manager = await createTestEmployee({ role: "manager" });
    const branch = await createTestBranch();
    await signInAs(await createTestEmployee({ role: "admin" }));
    await put(manager.id, { branchIds: [branch.id], permissions: ["shifts.view"] });
    expect((await put(manager.id, { branchIds: [], permissions: [] })).status).toBe(200);
    const access = await (await callRoute(GET, { params: { id: manager.id } })).json();
    expect(access).toEqual({ branchIds: [], permissions: [] });
  });

  it("forbids staff", async () => {
    const manager = await createTestEmployee({ role: "manager" });
    await signInAs(await createTestEmployee({ role: "staff" }));
    expect((await put(manager.id, { branchIds: [], permissions: [] })).status).toBe(403);
    expect((await callRoute(GET, { params: { id: manager.id } })).status).toBe(403);
  });

  it("rejects a target who is not a manager", async () => {
    const target = await createTestEmployee({ role: "staff" });
    await signInAs(await createTestEmployee({ role: "admin" }));
    const res = await put(target.id, { branchIds: [], permissions: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Nhân viên này không có vai trò quản lý.");
  });

  it("rejects invalid input with 400", async () => {
    const manager = await createTestEmployee({ role: "manager" });
    await signInAs(await createTestEmployee({ role: "admin" }));
    const invalid = [
      null,
      [],
      {},
      { branchIds: "x", permissions: [] },
      { branchIds: [1], permissions: [] },
      { branchIds: [], permissions: ["shifts.delete"] },
      { branchIds: [], permissions: "shifts.view" },
      { branchIds: [], permissions: ["constructor"] },
      { branchIds: ["not-a-uuid"], permissions: [] },
    ];
    for (const json of invalid) {
      const res = await put(manager.id, json);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Dữ liệu gửi lên không hợp lệ.");
    }
  });

  it("returns 404 for a malformed id", async () => {
    await signInAs(await createTestEmployee({ role: "admin" }));
    expect((await callRoute(GET, { params: { id: "nope" } })).status).toBe(404);
  });
});
