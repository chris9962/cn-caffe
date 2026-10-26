import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupFixtures,
  cleanupPayrollMonth,
  createTestBranch,
  createTestEmployee,
  signInAs,
  signOut,
} from "@/tests/helpers/fixtures";
import { callRoute } from "@/tests/helpers/route";
import { currentMonth } from "@/lib/date";
import type { MonthlyConfig, MyPay, PayAdjustment, PayRate, PayrollMonth } from "@/types/payroll";
import { DELETE as rateDELETE } from "../employees/[id]/pay-rates/[rateId]/route";
import { GET as ratesGET, POST as ratesPOST } from "../employees/[id]/pay-rates/route";
import { GET as configGET, PUT as configPUT } from "../monthly-config/route";
import { DELETE as adjustmentDELETE } from "../pay-adjustments/[id]/route";
import { GET as adjustmentsGET, POST as adjustmentsPOST } from "../pay-adjustments/route";
import { GET as minePGET } from "../../payroll/mine/route";
import { POST as closePOST } from "./close/route";
import { GET as exportGET } from "./export/route";
import { POST as reopenPOST } from "./reopen/route";
import { GET as payrollGET } from "./route";

const db = createAdminClient();
// A past month that no other test file uses, because closing it locks its shifts.
const month = "2025-03";
const monthDate = `${month}-01`;
const at = (day: string, time: string) => `${month}-${day}T${time}:00+07:00`;

type Person = { id: string; phone: string; password: string };
let admin: Person;
let staff: Person;
let fullTimer: Person;
let branch: { id: string };
let pendingShiftId: string;

async function insertShift(employeeId: string, day: string, from: string, to: string, status = "valid"): Promise<string> {
  const { data } = await db
    .from("shifts")
    .insert({
      employee_id: employeeId,
      branch_id: branch.id,
      work_date: `${month}-${day}`,
      status,
      source: "manual",
      check_in_at: at(day, from),
      check_out_at: to.includes("T") ? to : at(day, to),
      created_by: employeeId,
    })
    .select("id")
    .single()
    .throwOnError();
  return data.id;
}

const json = (body: unknown) => ({ method: "POST", json: body });
const payroll = (query = `?month=${month}`) => callRoute(payrollGET, { url: `http://localhost/api/admin/payroll${query}` });
const close = (body: unknown = { month }) => callRoute(closePOST, json(body));
const reopen = (body: unknown) => callRoute(reopenPOST, json(body));
const mine = () => callRoute(minePGET, { url: `http://localhost/api/payroll/mine?month=${month}` });
const addRate = (id: string, body: unknown) => callRoute(ratesPOST, { ...json(body), params: { id } });
const addAdjustment = (body: unknown) => callRoute(adjustmentsPOST, json(body));

beforeAll(async () => {
  await cleanupPayrollMonth(monthDate);
  branch = await createTestBranch();
  admin = await createTestEmployee({ role: "admin", fullName: "Admin Lương" });
  staff = await createTestEmployee({ fullName: "Bán Thời Gian" });
  fullTimer = await createTestEmployee({ fullName: "Toàn Thời Gian", employmentType: "full_time" });

  // Spec 8.7 shapes: a day shift, an evening shift crossing 23:00 and one past midnight.
  await insertShift(staff.id, "10", "08:00", "12:00");
  await insertShift(staff.id, "10", "18:00", "23:30");
  await insertShift(staff.id, "20", "20:00", `${month}-21T01:00:00+07:00`);
  await insertShift(staff.id, "22", "08:00", "09:00", "rejected");
  pendingShiftId = await insertShift(fullTimer.id, "05", "08:00", "17:00", "pending_review");
});

afterAll(async () => {
  await cleanupPayrollMonth(monthDate);
  await cleanupFixtures();
  signOut();
});

describe("permissions", () => {
  beforeEach(async () => {
    await signInAs(staff);
  });

  it("refuses payroll admin routes to staff", async () => {
    expect((await payroll()).status).toBe(403);
    expect((await close()).status).toBe(403);
    expect((await addRate(staff.id, { employmentType: "part_time", amount: 1, effectiveFrom: "2025-01-01" })).status).toBe(403);
    expect((await callRoute(configGET, { url: `http://localhost/api/admin/monthly-config?month=${month}` })).status).toBe(403);
  });
});

describe("setup by an admin", () => {
  beforeEach(async () => {
    await signInAs(admin);
  });

  it("adds pay rates and refuses a second rate on the same day", async () => {
    const first = await addRate(staff.id, { employmentType: "part_time", amount: 25_000, effectiveFrom: "2025-01-01" });
    expect(first.status).toBe(201);
    expect((await addRate(staff.id, { employmentType: "part_time", amount: 28_000, effectiveFrom: "2025-03-15" })).status).toBe(201);
    expect((await addRate(staff.id, { employmentType: "part_time", amount: 1, effectiveFrom: "2025-03-15" })).status).toBe(409);
    expect((await addRate(staff.id, { employmentType: "part_time", amount: 0, effectiveFrom: "2025-04-01" })).status).toBe(400);
    expect(
      (await addRate(fullTimer.id, { employmentType: "full_time", amount: 3_100_000, effectiveFrom: "2025-01-01" })).status,
    ).toBe(201);

    const list = await callRoute(ratesGET, { params: { id: staff.id } });
    const rates = (await list.json()) as PayRate[];
    expect(rates.map((rate) => rate.effectiveFrom)).toEqual(["2025-03-15", "2025-01-01"]);
  });

  it("deletes a pay rate", async () => {
    const created = (await (
      await addRate(staff.id, { employmentType: "part_time", amount: 1, effectiveFrom: "2030-01-01" })
    ).json()) as PayRate;
    const res = await callRoute(rateDELETE, { method: "DELETE", params: { id: staff.id, rateId: created.id } });
    expect(res.status).toBe(204);
  });

  it("saves the month's overtime settings", async () => {
    const res = await callRoute(configPUT, {
      method: "PUT",
      json: { month, overtimeStart: "23:00", overtimeEnd: "06:00", overtimeHourlyRate: 30_000, maxShiftMinutes: 960 },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ month, overtimeHourlyRate: 30_000, isLocked: false });

    const bad = await callRoute(configPUT, {
      method: "PUT",
      json: { month, overtimeStart: "25:00", overtimeEnd: "06:00", overtimeHourlyRate: 1, maxShiftMinutes: 960 },
    });
    expect(bad.status).toBe(400);
  });

  it("adds adjustments with a reason and deletes them", async () => {
    expect((await addAdjustment({ employeeId: staff.id, month, amount: 200_000, note: "Thưởng doanh số" })).status).toBe(201);
    expect((await addAdjustment({ employeeId: staff.id, month, amount: -100_000, note: "Phạt đi trễ" })).status).toBe(201);
    expect((await addAdjustment({ employeeId: staff.id, month, amount: 5, note: "  " })).status).toBe(400);

    const extra = (await (await addAdjustment({ employeeId: staff.id, month, amount: 1, note: "Nhầm" })).json()) as PayAdjustment;
    expect((await callRoute(adjustmentDELETE, { method: "DELETE", params: { id: extra.id } })).status).toBe(204);

    const list = await callRoute(adjustmentsGET, { url: `http://localhost/api/admin/pay-adjustments?month=${month}` });
    expect(((await list.json()) as PayAdjustment[]).map((item) => item.amount)).toEqual([200_000, -100_000]);
  });
});

describe("estimate, close and reopen", () => {
  beforeEach(async () => {
    await signInAs(admin);
  });

  it("estimates the open month with the spec's part time result", async () => {
    const data = (await (await payroll()).json()) as PayrollMonth;
    expect(data).toMatchObject({ status: "open", hasEnded: true, shownVersion: null });
    expect(data.blockingShifts.map((item) => item.id)).toEqual([pendingShiftId]);

    const partTime = data.payslips.find((payslip) => payslip.employeeId === staff.id)!;
    // The rejected shift earns nothing; the rest matches spec 8.7.
    expect(partTime.totals).toMatchObject({ regularPay: 309_000, overtimePay: 75_000, total: 484_000 });
    const fullTime = data.payslips.find((payslip) => payslip.employeeId === fullTimer.id)!;
    expect(fullTime.totals.fixedPay).toBe(3_100_000);
  });

  it("refuses to close the current month or a month with blocking shifts", async () => {
    expect((await close({ month: currentMonth() })).status).toBe(409);
    const blocked = await close();
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({ error: "Tháng còn ca đang làm, thiếu check out hoặc chờ duyệt." });
  });

  it("closes the month, locks it and shows the stored payslip to the employee", async () => {
    await db.from("shifts").update({ status: "valid" }).eq("id", pendingShiftId).throwOnError();

    const res = await close();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ month, version: 1 });

    const data = (await (await payroll()).json()) as PayrollMonth;
    expect(data).toMatchObject({ status: "closed", shownVersion: 1 });
    expect(data.versions).toHaveLength(1);

    // Every change to the closed month is refused.
    expect((await addAdjustment({ employeeId: staff.id, month, amount: 1, note: "Muộn" })).status).toBe(409);
    const config = await callRoute(configPUT, {
      method: "PUT",
      json: { month, overtimeStart: "22:00", overtimeEnd: "06:00", overtimeHourlyRate: 1, maxShiftMinutes: 960 },
    });
    expect(config.status).toBe(409);
    // The trigger guards the table itself, so even the service role cannot change a closed month's shifts.
    const { error } = await db.from("shifts").update({ status: "rejected" }).eq("id", pendingShiftId);
    expect(error?.message).toBe("month_closed");
    const configRead = (await (
      await callRoute(configGET, { url: `http://localhost/api/admin/monthly-config?month=${month}` })
    ).json()) as MonthlyConfig;
    expect(configRead.isLocked).toBe(true);
    expect((await close()).status).toBe(409);

    await signInAs(staff);
    const pay = (await (await mine()).json()) as MyPay;
    expect(pay).toMatchObject({ month, isEstimate: false });
    expect(pay.payslip?.totals.total).toBe(484_000);
  });

  it("exports the closed month as an Excel file", async () => {
    const res = await callRoute(exportGET, { url: `http://localhost/api/admin/payroll/export?month=${month}` });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // An .xlsx file is a zip archive, which starts with "PK".
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
  });

  it("reopens with a reason, shows an estimate again and keeps the old version after closing again", async () => {
    expect((await reopen({ month, reason: " " })).status).toBe(400);
    expect((await reopen({ month, reason: "Thiếu thưởng" })).status).toBe(200);

    expect((await addAdjustment({ employeeId: staff.id, month, amount: 16_000, note: "Thưởng thêm" })).status).toBe(201);
    expect((await callRoute(exportGET, { url: `http://localhost/api/admin/payroll/export?month=${month}` })).status).toBe(409);

    await signInAs(staff);
    const estimate = (await (await mine()).json()) as MyPay;
    expect(estimate).toMatchObject({ isEstimate: true });
    expect(estimate.payslip?.totals.total).toBe(500_000);

    await signInAs(admin);
    expect(await (await close()).json()).toEqual({ month, version: 2 });

    const latest = (await (await payroll()).json()) as PayrollMonth;
    expect(latest.versions.map((item) => item.version)).toEqual([2, 1]);
    expect(latest.versions[1]).toMatchObject({ reopenReason: "Thiếu thưởng", reopenedByName: "Admin Lương" });

    const old = (await (await payroll(`?month=${month}&version=1`)).json()) as PayrollMonth;
    expect(old.payslips.find((payslip) => payslip.employeeId === staff.id)?.totals.total).toBe(484_000);

    await signInAs(staff);
    expect(((await (await mine()).json()) as MyPay).payslip?.totals.total).toBe(500_000);
  });
});
