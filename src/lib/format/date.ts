/**
 * The sheet encodes dates as "dd/MM/yyyy", or "xx/MM/yyyy" as a placeholder for
 * "day not yet known" (recurring bills before the exact debit date is set). We keep
 * this as a partially-structured string rather than a strict Date, mirroring the sheet.
 */
export const UNKNOWN_DAY_PLACEHOLDER = "xx";

const DATE_PATTERN = /^(\d{2}|xx)\/(\d{2})\/(\d{4})$/i;

export interface ParsedSheetDate {
  dayKnown: boolean;
  day: string; // "01".."31" or "xx"
  month: string; // "01".."12"
  year: string; // "yyyy"
}

export function parseSheetDate(value: string): ParsedSheetDate | null {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  return { dayKnown: day.toLowerCase() !== UNKNOWN_DAY_PLACEHOLDER, day, month, year };
}

export function formatSheetDate(date: ParsedSheetDate): string {
  return `${date.dayKnown ? date.day : UNKNOWN_DAY_PLACEHOLDER}/${date.month}/${date.year}`;
}

export function isValidSheetDateText(value: string): boolean {
  return DATE_PATTERN.test(value.trim());
}
