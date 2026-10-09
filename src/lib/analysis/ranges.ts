import { MONTH_NAMES } from "../sheets/monthNames";
import { monthKey, refFromKey, shortMonth, type Now } from "./months";
import type { MonthPoint } from "./timeline";

/** A slice of the timeline: a preset ("year", "ytd"...), one calendar year ("y:2025") or a custom span of months ("r:2026-03:2026-08"). */
export type RangeId = "month" | "year" | "ytd" | "next12" | "nextYear" | "all" | `y:${string}` | `r:${string}`;

export const DEFAULT_RANGE: RangeId = "year";

export function isCustomRange(id: RangeId): boolean {
  return id.startsWith("r:");
}

/** Builds a custom range from two month keys, in any order. */
export function customRange(a: string, b: string): RangeId {
  return a <= b ? `r:${a}:${b}` : `r:${b}:${a}`;
}

/** The two month keys (inclusive) of a custom range. */
export function customBounds(id: RangeId): { from: string; to: string } {
  const [, from, to] = id.split(":");
  return { from, to };
}

/** "Set/26", or "Jun/26 – Set/26" when the span has more than one month. */
export function customRangeLabel(id: RangeId): string {
  const { from, to } = customBounds(id);
  const short = (key: string) => {
    const ref = refFromKey(key);
    return `${shortMonth(ref.month)}/${ref.year.slice(2)}`;
  };
  return from === to ? short(from) : `${short(from)} – ${short(to)}`;
}

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
    case "month":
      return timeline.filter((point) => point.key === currentKey);
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
    default: {
      if (isCustomRange(id)) {
        const { from, to } = customBounds(id);
        return timeline.filter((point) => point.key >= from && point.key <= to);
      }
      return timeline.filter((point) => point.year === id.slice(2));
    }
  }
}

/** Presets first, then any other year that has data; ranges with no months are left out ("Este ano" always stays). */
export function rangeOptions(timeline: MonthPoint[], now: Now): RangeOption[] {
  const otherYears = [...new Set(timeline.map((point) => point.year))]
    .filter((year) => year !== String(now.year) && year !== String(now.year + 1))
    .sort();
  const options: RangeOption[] = [
    { id: "month", label: "Este mês" },
    { id: "year", label: "Este ano" },
    { id: "ytd", label: "Este ano até agora" },
    { id: "next12", label: "Próximos 12 meses" },
    { id: "nextYear", label: "Próximo ano" },
    ...otherYears.map((year): RangeOption => ({ id: `y:${year}`, label: year })),
    { id: "all", label: "Tudo" },
  ];
  return options.filter((option) => option.id === "year" || pointsInRange(timeline, option.id, now).length > 0);
}
