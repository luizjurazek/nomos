import { MONTH_NAMES } from "../sheets/monthNames";
import { monthKey, type Now } from "./months";
import type { MonthPoint } from "./timeline";

/** A slice of the timeline: a preset ("year", "ytd"...) or one calendar year ("y:2025"). */
export type RangeId = "year" | "ytd" | "next12" | "nextYear" | "all" | `y:${string}`;

export interface RangeOption {
  id: RangeId;
  label: string;
}

export function currentKeyOf(now: Now): string {
  return monthKey({ year: String(now.year), month: MONTH_NAMES[now.monthIndex] });
}

/** The months of `timeline` that a range covers. */
export function pointsInRange(timeline: MonthPoint[], id: RangeId, now: Now): MonthPoint[] {
  const currentKey = currentKeyOf(now);
  switch (id) {
    case "all":
      return timeline;
    case "year":
      return timeline.filter((point) => point.year === String(now.year));
    case "ytd":
      return timeline.filter((point) => point.year === String(now.year) && point.key <= currentKey);
    case "next12":
      return timeline.filter((point) => point.key >= currentKey).slice(0, 12);
    case "nextYear":
      return timeline.filter((point) => point.year === String(now.year + 1));
    default:
      return timeline.filter((point) => point.year === id.slice(2));
  }
}

/** Presets first, then any other year that has data; ranges with no months are left out ("Este ano" always stays). */
export function rangeOptions(timeline: MonthPoint[], now: Now): RangeOption[] {
  const otherYears = [...new Set(timeline.map((point) => point.year))]
    .filter((year) => year !== String(now.year) && year !== String(now.year + 1))
    .sort();
  const options: RangeOption[] = [
    { id: "year", label: "Este ano" },
    { id: "ytd", label: "Este ano até agora" },
    { id: "next12", label: "Próximos 12 meses" },
    { id: "nextYear", label: "Próximo ano" },
    ...otherYears.map((year): RangeOption => ({ id: `y:${year}`, label: year })),
    { id: "all", label: "Tudo" },
  ];
  return options.filter((option) => option.id === "year" || pointsInRange(timeline, option.id, now).length > 0);
}
