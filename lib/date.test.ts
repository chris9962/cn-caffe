import { describe, expect, it } from "vitest";
import { currentMonth, formatDateTime, formatDuration, monthRange, toVietnamIso, toVietnamLocalInput } from "./date";

describe("monthRange", () => {
  it("returns the first day of the month and of the next month", () => {
    expect(monthRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });

  it.each(["2026-13", "2026-00", "2026-1", "2026-10-01", "bad", ""])("rejects %s", (month) => {
    expect(monthRange(month)).toBeNull();
  });
});

describe("currentMonth", () => {
  it("uses Vietnam time", () => {
    expect(currentMonth(new Date("2026-10-31T17:30:00Z"))).toBe("2026-11");
    expect(currentMonth(new Date("2026-10-31T16:59:00Z"))).toBe("2026-10");
  });
});

describe("Vietnam local date-time conversions", () => {
  it("adds the Vietnam offset to a datetime-local value", () => {
    expect(toVietnamIso("2026-10-25T08:30")).toBe("2026-10-25T08:30:00+07:00");
  });

  it("turns an instant into a datetime-local value in Vietnam time", () => {
    expect(toVietnamLocalInput("2026-10-25T01:30:00Z")).toBe("2026-10-25T08:30");
    expect(toVietnamLocalInput("2026-10-31T17:05:00Z")).toBe("2026-11-01T00:05");
  });

  it("round-trips", () => {
    expect(new Date(toVietnamIso(toVietnamLocalInput("2026-10-25T01:30:00Z"))).toISOString()).toBe(
      "2026-10-25T01:30:00.000Z",
    );
  });
});

describe("formatDateTime", () => {
  it("formats an instant as dd/MM/yyyy HH:mm in Vietnam time", () => {
    expect(formatDateTime("2026-10-25T01:30:00Z")).toBe("25/10/2026 08:30");
    expect(formatDateTime("2026-10-31T17:05:00Z")).toBe("01/11/2026 00:05");
    expect(formatDateTime("2026-01-05T08:02:00+07:00")).toBe("05/01/2026 08:02");
  });
});

describe("formatDuration", () => {
  it.each([
    [330, "5 giờ 30 phút"],
    [45, "45 phút"],
    [120, "2 giờ"],
    [0, "0 phút"],
    [90.7, "1 giờ 30 phút"],
  ])("formats %s minutes", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
