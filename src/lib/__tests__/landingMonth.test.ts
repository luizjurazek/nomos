import { describe, expect, it } from "vitest";
import { getCurrentYearMonth, pickLandingMonth } from "../sheets/monthNames";

const JUN_TO_DEC = ["Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

describe("pickLandingMonth", () => {
  it("picks the current month when its tab exists", () => {
    expect(pickLandingMonth(JUN_TO_DEC, 8)).toBe("Setembro");
  });

  it("falls back to the latest earlier tab when the month has no tab", () => {
    expect(pickLandingMonth(["Junho", "Julho"], 8)).toBe("Julho");
  });

  it("falls back to the first tab when every tab is in the future", () => {
    expect(pickLandingMonth(JUN_TO_DEC, 2)).toBe("Junho");
  });

  it("returns null without tabs", () => {
    expect(pickLandingMonth([], 8)).toBeNull();
  });
});

describe("getCurrentYearMonth", () => {
  it("uses São Paulo time, not UTC, around midnight", () => {
    // 2026-10-01 01:00 UTC is still 2026-09-30 22:00 in São Paulo.
    expect(getCurrentYearMonth(new Date("2026-10-01T01:00:00Z"))).toEqual({ year: 2026, monthIndex: 8 });
    expect(getCurrentYearMonth(new Date("2027-01-01T03:30:00Z"))).toEqual({ year: 2027, monthIndex: 0 });
  });
});
