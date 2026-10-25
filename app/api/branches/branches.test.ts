import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupFixtures, createTestBranch, createTestEmployee, signInAs, signOut, trackBranch } from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { GET as adminGET, POST as adminPOST } from "../admin/branches/route";
import { PATCH } from "../admin/branches/[id]/route";
import { POST as resolvePOST } from "../admin/branches/resolve-map-link/route";
import { GET } from "./route";

const LONG_URL =
  "https://www.google.com/maps/place/Ben+Thanh/@10.7720,106.6980,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d10.772463!4d106.698017";
const NO_COORDINATES =
  "Link không có toạ độ. Bạn mở Google Maps, chọn đúng quán, bấm Chia sẻ rồi copy link.";

beforeEach(signOut);
afterEach(() => vi.restoreAllMocks());
afterAll(cleanupFixtures);

const signInAsAdmin = async () => signInAs(await createTestEmployee({ role: "admin" }));

const newBranch = {
  name: "Chi nhánh API",
  address: "1 Lê Lợi",
  googleMapsUrl: null,
  latitude: 10.5,
  longitude: 106.5,
  radiusM: 150,
};

async function createViaApi(json: unknown = newBranch) {
  const res = await callRoute(adminPOST, { method: "POST", json });
  if (res.status === 201) trackBranch((await res.clone().json()).id);
  return res;
}

describe("GET /api/branches", () => {
  it("sorts active branches by distance", async () => {
    const far = await createTestBranch({ latitude: 21.0, longitude: 105.8 });
    const near = await createTestBranch({ latitude: 10.7769, longitude: 106.7009 });
    await createTestBranch({ latitude: 10.7769, longitude: 106.7009, isActive: false });
    await signInAs(await createTestEmployee({ role: "staff" }));

    const res = await callRoute(GET, { url: "http://localhost/api/branches?lat=10.7769&lng=106.7009" });
    const list = await res.json();

    expect(res.status).toBe(200);
    expect(list[0].distanceM).toBeLessThan(1);
    const ids = list.map((b: { id: string }) => b.id);
    expect(ids.indexOf(near.id)).toBeLessThan(ids.indexOf(far.id));
    expect(list.every((b: { isActive: boolean }) => b.isActive)).toBe(true);
  });

  it("lists by name without coordinates", async () => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    const res = await callRoute(GET, {});
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it.each(["?lat=10.7", "?lng=106.7", "?lat=abc&lng=1", "?lat=95&lng=1"])("rejects %s", async (query) => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    const res = await callRoute(GET, { url: `http://localhost/api/branches${query}` });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Toạ độ không hợp lệ.");
  });

  it("requires login", async () => {
    expect((await callRoute(GET, {})).status).toBe(401);
  });
});

describe("admin branches API", () => {
  it("forbids staff", async () => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    expect((await callRoute(adminPOST, { method: "POST", json: newBranch })).status).toBe(403);
    expect((await callRoute(adminGET, {})).status).toBe(403);
  });

  it("creates a branch and lists it", async () => {
    await signInAsAdmin();
    const res = await createViaApi();
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created).toMatchObject({ name: "Chi nhánh API", radiusM: 150, isActive: true, googleMapsUrl: null });

    const list = await (await callRoute(adminGET, {})).json();
    expect(list.map((b: { id: string }) => b.id)).toContain(created.id);
  });

  it.each([
    [null, "Dữ liệu gửi lên không hợp lệ."],
    [{ ...newBranch, name: "  " }, "Tên chi nhánh không được để trống."],
    [{ ...newBranch, latitude: 91 }, "Toạ độ không hợp lệ."],
    [{ ...newBranch, longitude: "1" }, "Toạ độ không hợp lệ."],
    [{ ...newBranch, radiusM: 0 }, "Bán kính phải là số nguyên dương."],
    [{ ...newBranch, radiusM: 10.5 }, "Bán kính phải là số nguyên dương."],
  ])("rejects invalid body %#", async (json, message) => {
    await signInAsAdmin();
    const res = await createViaApi(json);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(message);
  });

  it("updates a branch and deactivates it", async () => {
    await signInAsAdmin();
    const { id } = await (await createViaApi()).json();
    const res = await callRoute(PATCH, {
      method: "PATCH",
      params: { id },
      json: { name: "Tên mới", radiusM: 200, isActive: false },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id, name: "Tên mới", radiusM: 200, isActive: false });
  });

  it("returns 404 for an unknown branch", async () => {
    await signInAsAdmin();
    const res = await callRoute(PATCH, {
      method: "PATCH",
      params: { id: "00000000-0000-0000-0000-000000000000" },
      json: { name: "x" },
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Không tìm thấy chi nhánh.");
  });
});

describe("POST /api/admin/branches/resolve-map-link", () => {
  const resolve = (url: unknown) => callRoute(resolvePOST, { method: "POST", json: { url } });

  it("forbids staff", async () => {
    await signInAs(await createTestEmployee({ role: "staff" }));
    expect((await resolve(LONG_URL)).status).toBe(403);
  });

  it("reads coordinates from a full link", async () => {
    await signInAsAdmin();
    const res = await resolve(LONG_URL);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ latitude: 10.772463, longitude: 106.698017, resolvedUrl: LONG_URL });
  });

  it("follows a short link", async () => {
    await signInAsAdmin();
    const originalFetch = globalThis.fetch;
    const isShortLink = (input: Parameters<typeof fetch>[0]) => String(input).startsWith("https://maps.app.goo.gl/");
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
      isShortLink(input)
        ? Promise.resolve({ url: LONG_URL, body: null } as Response)
        : originalFetch(input, init),
    );

    const res = await resolve("https://maps.app.goo.gl/abc");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ latitude: 10.772463, longitude: 106.698017 });
  });

  it("rejects a link without coordinates", async () => {
    await signInAsAdmin();
    const res = await resolve("https://www.google.com/maps/place/Ben+Thanh");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(NO_COORDINATES);
  });

  it("rejects a non-Google link", async () => {
    await signInAsAdmin();
    const res = await resolve("https://example.com/maps/@10.7,106.7,15z");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(NO_COORDINATES);
  });

  it("rejects a failing short link", async () => {
    await signInAsAdmin();
    const originalFetch = globalThis.fetch;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
      String(input).startsWith("https://maps.app.goo.gl/")
        ? Promise.reject(new Error("network"))
        : originalFetch(input, init),
    );
    const res = await resolve("https://maps.app.goo.gl/abc");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Không mở được link Google Maps. Bạn kiểm tra lại link.");
  });
});
