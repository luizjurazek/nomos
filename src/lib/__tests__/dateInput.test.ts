import { describe, expect, it } from "vitest";
import { isRealCalendarDate, isValidSheetDate, maskDateInput } from "../format/date";

describe("maskDateInput", () => {
  it("inserts the slashes as digits are typed", () => {
    expect(maskDateInput("1")).toBe("1");
    expect(maskDateInput("18")).toBe("18");
    expect(maskDateInput("180")).toBe("18/0");
    expect(maskDateInput("18092")).toBe("18/09/2");
    expect(maskDateInput("18092026")).toBe("18/09/2026");
  });

  it("drops non-digits and anything past 8 digits, and lets a deleted slash go", () => {
    expect(maskDateInput("18/09/2026999")).toBe("18/09/2026");
    expect(maskDateInput("1a8-0")).toBe("18/0");
    expect(maskDateInput("18/")).toBe("18");
  });
});

describe("isRealCalendarDate", () => {
  it("accepts real days and rejects impossible ones", () => {
    expect(isRealCalendarDate("18/09/2026")).toBe(true);
    expect(isRealCalendarDate("29/02/2028")).toBe(true);
    expect(isRealCalendarDate("29/02/2026")).toBe(false);
    expect(isRealCalendarDate("31/04/2026")).toBe(false);
    expect(isRealCalendarDate("18/13/2026")).toBe(false);
    expect(isRealCalendarDate("18/09")).toBe(false);
    expect(isRealCalendarDate("xx/09/2026")).toBe(false);
  });
});

describe("isValidSheetDate", () => {
  it("accepts real days and the unknown-day placeholder, rejects partial text", () => {
    expect(isValidSheetDate("18/09/2026")).toBe(true);
    expect(isValidSheetDate("xx/09/2026")).toBe(true);
    expect(isValidSheetDate("xx/13/2026")).toBe(false);
    expect(isValidSheetDate("18/09/20")).toBe(false);
    expect(isValidSheetDate("")).toBe(false);
  });
});
