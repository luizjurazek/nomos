import { shortMonth, type MonthRef } from "@/lib/analysis/months";

/** "Setembro 2026" */
export function refLabel(ref: MonthRef): string {
  return `${ref.month} ${ref.year}`;
}

/** "set/26" */
export function shortRefLabel(ref: MonthRef): string {
  return `${shortMonth(ref.month).toLowerCase()}/${ref.year.slice(2)}`;
}
