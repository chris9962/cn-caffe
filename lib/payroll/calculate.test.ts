import { describe, expect, it } from "vitest";
import { calculatePayslip, needsPayslip, overtimeMinutes, type PayrollInput, type ShiftInput } from "./calculate";

const config = { overtimeStart: "23:00", overtimeEnd: "06:00", overtimeHourlyRate: 30_000 };
const employee = { id: "e1", fullName: "Nhân viên A", phone: "84900000001", endDate: null };

let shiftCount = 0;
function shift(checkIn: string, checkOut: string, branch = "b1"): ShiftInput {
  shiftCount += 1;
  return {
    id: `s${shiftCount}`,
    branchId: branch,
    branchName: branch === "b1" ? "Chi nhánh 1" : "Chi nhánh 2",
    workDate: checkIn.slice(0, 10),
    checkInAt: `${checkIn}:00+07:00`,
    checkOutAt: `${checkOut}:00+07:00`,
  };
}

function input(overrides: Partial<PayrollInput>): PayrollInput {
  return { month: "2026-10", employee, rates: [], config, shifts: [], adjustments: [], ...overrides };
}

describe("overtimeMinutes", () => {
  // The split table in spec section 8.3, with the window 23:00–06:00.
  it.each([
    ["2026-10-10T18:00", "2026-10-10T23:30", 30],
    ["2026-10-11T00:30", "2026-10-11T03:00", 150],
    ["2026-10-11T05:00", "2026-10-11T09:00", 60],
    ["2026-10-10T22:00", "2026-10-11T07:00", 420],
  ])("counts %s → %s", (checkIn, checkOut, expected) => {
    expect(overtimeMinutes(`${checkIn}:00+07:00`, `${checkOut}:00+07:00`, "23:00", "06:00")).toBe(expected);
  });

  it("handles a window that does not cross midnight", () => {
    expect(overtimeMinutes("2026-10-10T17:00:00+07:00", "2026-10-10T21:00:00+07:00", "18:00", "20:00")).toBe(120);
  });

  it("returns 0 when the window is empty", () => {
    expect(overtimeMinutes("2026-10-10T22:00:00+07:00", "2026-10-11T07:00:00+07:00", "06:00", "06:00")).toBe(0);
  });

  it("covers a shift longer than one day", () => {
    expect(overtimeMinutes("2026-10-10T20:00:00+07:00", "2026-10-12T02:00:00+07:00", "23:00", "06:00")).toBe(7 * 60 + 3 * 60);
  });
});

describe("calculatePayslip", () => {
  it("matches the part time example in spec section 8.7", () => {
    const payslip = calculatePayslip(
      input({
        rates: [
          { employmentType: "part_time", amount: 25_000, effectiveFrom: "2026-10-01" },
          { employmentType: "part_time", amount: 28_000, effectiveFrom: "2026-10-15" },
        ],
        shifts: [
          shift("2026-10-10T08:00", "2026-10-10T12:00"),
          shift("2026-10-10T18:00", "2026-10-10T23:30"),
          shift("2026-10-20T20:00", "2026-10-21T01:00"),
        ],
        adjustments: [
          { id: "a1", amount: 200_000, note: "Thưởng doanh số" },
          { id: "a2", amount: -100_000, note: "Phạt đi trễ" },
        ],
      }),
    );

    expect(payslip.shifts.map((item) => [item.regularPay, item.overtimePay])).toEqual([
      [100_000, 0],
      [125_000, 15_000],
      [84_000, 60_000],
    ]);
    expect(payslip.totals).toEqual({
      regularMinutes: 12 * 60,
      overtimeMinutes: 150,
      regularPay: 309_000,
      overtimePay: 75_000,
      fixedPay: 0,
      additions: 200_000,
      deductions: -100_000,
      total: 484_000,
    });
    expect(payslip.employmentTypes).toEqual(["part_time"]);
  });

  it("matches the full time example in spec section 8.8", () => {
    const payslip = calculatePayslip(
      input({
        rates: [
          { employmentType: "full_time", amount: 9_000_000, effectiveFrom: "2026-09-01" },
          { employmentType: "full_time", amount: 10_000_000, effectiveFrom: "2026-10-15" },
        ],
        shifts: [shift("2026-10-10T22:00", "2026-10-11T07:00")],
      }),
    );

    expect(payslip.fixedSegments).toEqual([
      { from: "2026-10-01", to: "2026-10-14", days: 14, monthlyAmount: 9_000_000, pay: 4_064_516 },
      { from: "2026-10-15", to: "2026-10-31", days: 17, monthlyAmount: 10_000_000, pay: 5_483_871 },
    ]);
    expect(payslip.totals.fixedPay).toBe(9_548_387);
    // Full time hours are tracked but earn nothing extra, overtime included.
    expect(payslip.shifts[0]).toMatchObject({ regularMinutes: 540, overtimeMinutes: 0, regularPay: 0, overtimePay: 0 });
    expect(payslip.totals.total).toBe(9_548_387);
  });

  it("pays each part of a month under the employment type of that part", () => {
    const payslip = calculatePayslip(
      input({
        rates: [
          { employmentType: "part_time", amount: 25_000, effectiveFrom: "2026-09-01" },
          { employmentType: "full_time", amount: 9_300_000, effectiveFrom: "2026-10-21" },
        ],
        shifts: [shift("2026-10-05T08:00", "2026-10-05T12:00"), shift("2026-10-25T08:00", "2026-10-25T12:00")],
      }),
    );

    expect(payslip.shifts.map((item) => item.regularPay)).toEqual([100_000, 0]);
    expect(payslip.fixedSegments).toEqual([
      { from: "2026-10-21", to: "2026-10-31", days: 11, monthlyAmount: 9_300_000, pay: 3_300_000 },
    ]);
    expect(payslip.employmentTypes).toEqual(["part_time", "full_time"]);
    expect(payslip.totals.total).toBe(3_400_000);
  });

  it("starts the fixed amount on the first rate and stops it after the end date", () => {
    const payslip = calculatePayslip(
      input({
        employee: { ...employee, endDate: "2026-10-20" },
        rates: [{ employmentType: "full_time", amount: 3_100_000, effectiveFrom: "2026-10-11" }],
      }),
    );

    expect(payslip.fixedSegments).toEqual([
      { from: "2026-10-11", to: "2026-10-20", days: 10, monthlyAmount: 3_100_000, pay: 1_000_000 },
    ]);
  });

  it("pays nothing for a shift without a rate but still counts its hours per branch", () => {
    const payslip = calculatePayslip(
      input({ shifts: [shift("2026-10-05T08:00", "2026-10-05T12:00", "b2"), shift("2026-10-06T08:00", "2026-10-06T10:00")] }),
    );

    expect(payslip.shifts[0]).toMatchObject({ employmentType: null, regularPay: 0 });
    expect(payslip.branches).toEqual([
      { branchId: "b1", branchName: "Chi nhánh 1", minutes: 120 },
      { branchId: "b2", branchName: "Chi nhánh 2", minutes: 240 },
    ]);
    expect(payslip.totals.total).toBe(0);
  });

  it("rounds each money line to the dong", () => {
    const payslip = calculatePayslip(
      input({
        rates: [{ employmentType: "part_time", amount: 25_001, effectiveFrom: "2026-10-01" }],
        shifts: [shift("2026-10-05T08:00", "2026-10-05T08:07"), shift("2026-10-06T08:00", "2026-10-06T08:07")],
      }),
    );

    // 7 minutes × 25.001 đ/giờ = 2.916,78 đ, rounded per shift before summing.
    expect(payslip.shifts.map((item) => item.regularPay)).toEqual([2917, 2917]);
    expect(payslip.totals.regularPay).toBe(5834);
  });
});

describe("needsPayslip", () => {
  it("is false for someone with nothing in the month", () => {
    expect(needsPayslip(input({ rates: [{ employmentType: "part_time", amount: 1, effectiveFrom: "2026-11-01" }] }))).toBe(false);
  });

  it("is true for a former employee who only has an adjustment", () => {
    expect(
      needsPayslip(input({ employee: { ...employee, endDate: "2026-09-30" }, adjustments: [{ id: "a", amount: 1, note: "x" }] })),
    ).toBe(true);
  });

  it("is true when any day of the month is under a rate", () => {
    expect(needsPayslip(input({ rates: [{ employmentType: "part_time", amount: 1, effectiveFrom: "2026-10-31" }] }))).toBe(true);
  });
});
