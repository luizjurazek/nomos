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

/** Progressive "dd/mm/yyyy" mask for typed text: keeps digits only (max 8) and inserts the slashes. */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** True for a real calendar day written as "dd/MM/yyyy" (rejects 31/02/2026 and the "xx" placeholder). */
export function isRealCalendarDate(value: string): boolean {
  const parsed = parseSheetDate(value);
  if (!parsed || !parsed.dayKnown) return false;
  const [day, month, year] = [Number(parsed.day), Number(parsed.month), Number(parsed.year)];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** A date the sheet can take: a real day, or the "xx/MM/yyyy" placeholder with a valid month. */
export function isValidSheetDate(value: string): boolean {
  const parsed = parseSheetDate(value);
  if (!parsed) return false;
  return parsed.dayKnown ? isRealCalendarDate(value) : Number(parsed.month) >= 1 && Number(parsed.month) <= 12;
}
