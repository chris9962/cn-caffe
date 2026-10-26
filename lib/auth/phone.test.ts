import { describe, expect, it } from "vitest";
import { normalizePhone, phoneToEmail } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["0901234567", "84901234567"],
    ["0901 234 567", "84901234567"],
    ["090.123.4567", "84901234567"],
    ["+84901234567", "84901234567"],
    ["84901234567", "84901234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "0123", "09012345678", "+1 555 0100"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

it("builds the internal email", () => {
  expect(phoneToEmail("84901234567")).toBe("84901234567@nhanvien.local");
});
