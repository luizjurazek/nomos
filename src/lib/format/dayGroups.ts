import { MONTH_NAMES } from "../sheets/monthNames";
import { parseSheetDate } from "./date";

export const UNKNOWN_DAY_KEY = "unknown";

/** "yyyy-MM-dd" for a known day, or UNKNOWN_DAY_KEY for the "xx/MM/yyyy" placeholder (or unparseable text). */
export function dayKey(value: string): string {
  const parsed = parseSheetDate(value);
  if (!parsed || !parsed.dayKnown) return UNKNOWN_DAY_KEY;
  return `${parsed.year}-${parsed.month}-${parsed.day}`;
}

/** Local calendar day of `now` as "yyyy-MM-dd". */
export function todayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toUtcDays(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Whole days from `today` to `key` (both "yyyy-MM-dd"); positive means the day is in the future. */
export function daysFromToday(key: string, today: string): number {
  return Math.round(toUtcDays(key) - toUtcDays(today));
}

export interface DayGroup<T> {
  key: string;
  rows: T[];
}

/** Newest day first; rows without a known day go last. Rows keep their sheet order inside a day. */
export function groupRowsByDay<T extends { date: string }>(rows: T[]): DayGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = dayKey(row.date);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNKNOWN_DAY_KEY) return 1;
      if (b === UNKNOWN_DAY_KEY) return -1;
      return b.localeCompare(a);
    })
    .map(([key, groupRows]) => ({ key, rows: groupRows }));
}

/** "Hoje" / "Ontem" / "Amanhã" when `today` is known, otherwise "12 de setembro". */
export function dayLabel(key: string, today: string | null): string {
  if (key === UNKNOWN_DAY_KEY) return "Dia a definir";
  if (today) {
    const diff = daysFromToday(key, today);
    if (diff === 0) return "Hoje";
    if (diff === -1) return "Ontem";
    if (diff === 1) return "Amanhã";
  }
  const [, month, day] = key.split("-").map(Number);
  return `${day} de ${MONTH_NAMES[month - 1].toLowerCase()}`;
}
