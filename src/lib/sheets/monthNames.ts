/**
 * Pure month-name helpers, safe to import from client components — unlike listMonths.ts,
 * this file never touches the Sheets API (and must stay that way, so it doesn't drag
 * "googleapis" into the browser bundle for any client component that needs a month name).
 */

/** Canonical, properly-capitalized Portuguese month names, in calendar order — matches how month tabs are titled. */
export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthIndex(tabTitle: string): number {
  const idx = MONTH_NAMES.findIndex((name) => name.toLowerCase() === tabTitle.trim().toLowerCase());
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

/** 1-indexed month number, e.g. "Novembro" -> "11", for building "xx/MM/yyyy" placeholder dates. */
export function getMonthNumber(monthTitle: string): string {
  const idx = monthIndex(monthTitle);
  if (idx === Number.MAX_SAFE_INTEGER) return "xx";
  return String(idx + 1).padStart(2, "0");
}

export function getAdjacentMonth(months: string[], current: string, direction: 1 | -1): string | null {
  const idx = months.indexOf(current);
  if (idx === -1) return null;
  return months[idx + direction] ?? null;
}

/** Chronologically previous month, crossing into the previous year at Janeiro (e.g. Janeiro 2027 -> Dezembro 2026). */
export function getPreviousMonthRef(year: string, monthTitle: string): { year: string; month: string } | null {
  const idx = monthIndex(monthTitle);
  if (idx === Number.MAX_SAFE_INTEGER) return null;
  const previousYear = String(Number(year) - 1);
  if (idx === 0) return { year: previousYear, month: MONTH_NAMES[MONTH_NAMES.length - 1] };
  return { year, month: MONTH_NAMES[idx - 1] };
}
