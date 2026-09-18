import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, daysFromToday, groupRowsByDay, UNKNOWN_DAY_KEY } from "../format/dayGroups";

describe("dayKey", () => {
  it("converts a sheet date to an ISO-like key", () => {
    expect(dayKey("05/09/2026")).toBe("2026-09-05");
  });

  it("maps the unknown-day placeholder and garbage to the unknown key", () => {
    expect(dayKey("xx/09/2026")).toBe(UNKNOWN_DAY_KEY);
    expect(dayKey("")).toBe(UNKNOWN_DAY_KEY);
  });
});

describe("groupRowsByDay", () => {
  it("groups newest first, keeps sheet order inside a day and puts unknown days last", () => {
    const rows = [
      { id: 1, date: "xx/09/2026" },
      { id: 2, date: "03/09/2026" },
      { id: 3, date: "10/09/2026" },
      { id: 4, date: "03/09/2026" },
    ];
    const groups = groupRowsByDay(rows);
    expect(groups.map((g) => g.key)).toEqual(["2026-09-10", "2026-09-03", UNKNOWN_DAY_KEY]);
    expect(groups[1].rows.map((r) => r.id)).toEqual([2, 4]);
  });
});

describe("daysFromToday", () => {
  it("counts whole days across month boundaries", () => {
    expect(daysFromToday("2026-10-02", "2026-09-30")).toBe(2);
    expect(daysFromToday("2026-09-17", "2026-09-18")).toBe(-1);
  });
});

describe("dayLabel", () => {
  it("uses relative names around today", () => {
    expect(dayLabel("2026-09-18", "2026-09-18")).toBe("Hoje");
    expect(dayLabel("2026-09-17", "2026-09-18")).toBe("Ontem");
    expect(dayLabel("2026-09-19", "2026-09-18")).toBe("Amanhã");
  });

  it("falls back to the day and month name", () => {
    expect(dayLabel("2026-09-05", "2026-09-18")).toBe("5 de setembro");
    expect(dayLabel("2026-09-05", null)).toBe("5 de setembro");
    expect(dayLabel(UNKNOWN_DAY_KEY, null)).toBe("Dia a definir");
  });
});
