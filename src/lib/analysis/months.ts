import { MONTH_NAMES, getMonthNumber, getPreviousMonthRef, monthIndex } from "../sheets/monthNames";
import type { AnalysisMonth } from "./types";

export interface MonthRef {
  year: string;
  month: string;
}

/** The current calendar month, as returned by `getCurrentYearMonth`. */
export interface Now {
  year: number;
  monthIndex: number;
}

/** The app's timezone: the server runs in UTC, so "this month" must not come from its local clock. */
const APP_TIME_ZONE = "America/Sao_Paulo";

export function currentMonthNow(date: Date = new Date()): Now {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), monthIndex: value("month") - 1 };
}

/** "2026-09": sorts chronologically as a plain string. */
export function monthKey(ref: MonthRef): string {
  return `${ref.year}-${getMonthNumber(ref.month)}`;
}

export function refFromKey(key: string): MonthRef {
  const [year, month] = key.split("-");
  return { year, month: MONTH_NAMES[Number(month) - 1] };
}

export function compareRefs(a: MonthRef, b: MonthRef): number {
  return Number(a.year) - Number(b.year) || monthIndex(a.month) - monthIndex(b.month);
}

export function previousRef(ref: MonthRef): MonthRef | null {
  return getPreviousMonthRef(ref.year, ref.month);
}

export function addMonths(ref: MonthRef, count: number): MonthRef {
  const total = Number(ref.year) * 12 + monthIndex(ref.month) + count;
  return { year: String(Math.floor(total / 12)), month: MONTH_NAMES[((total % 12) + 12) % 12] };
}

export function nextRef(ref: MonthRef): MonthRef {
  return addMonths(ref, 1);
}

/** "Set" — used on chart axes. */
export function shortMonth(month: string): string {
  return month.slice(0, 3);
}

/** True when `ref` is a month after the current calendar month. */
export function isAfterNow(ref: MonthRef, now: Now): boolean {
  return Number(ref.year) * 12 + monthIndex(ref.month) > now.year * 12 + now.monthIndex;
}

export function sortMonths(months: AnalysisMonth[]): AnalysisMonth[] {
  return [...months].sort(compareRefs);
}

export function indexByKey(months: AnalysisMonth[]): Map<string, AnalysisMonth> {
  return new Map(months.map((month) => [monthKey(month), month]));
}

export const sumValues = (rows: { valor: number }[]): number => rows.reduce((acc, row) => acc + row.valor, 0);
