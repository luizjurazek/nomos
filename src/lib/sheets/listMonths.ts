import "server-only";
import { unstable_cache } from "next/cache";
import { getSheetsClient } from "./client";
import { monthIndex } from "./monthNames";

const NON_MONTH_TABS = new Set(["dados", "config"]);

/** Lists a spreadsheet's month tabs (excludes "Dados" and anything else that isn't a recognized month name), chronologically ordered. Does not assume every year has all 12 months. */
export async function listMonths(spreadsheetId: string): Promise<string[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const titles = (response.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title))
    .filter((title) => !NON_MONTH_TABS.has(title.trim().toLowerCase()))
    .filter((title) => monthIndex(title) !== Number.MAX_SAFE_INTEGER);

  return titles.sort((a, b) => monthIndex(a) - monthIndex(b));
}

const MONTHS_CACHE_REVALIDATE_SECONDS = 300;

/**
 * Same as `listMonths`, cached per spreadsheet for a few minutes. Only for navigation (landing
 * redirect, year/month switcher): month tabs are created outside the app, so a new one showing up
 * a few minutes late is fine. Never use it to decide what to write (card rollover, carry-over) —
 * those must confirm against the real spreadsheet.
 */
export async function listMonthsCached(spreadsheetId: string): Promise<string[]> {
  return unstable_cache(() => listMonths(spreadsheetId), ["months", spreadsheetId], {
    revalidate: MONTHS_CACHE_REVALIDATE_SECONDS,
  })();
}

export { MONTH_NAMES, getAdjacentMonth, getMonthNumber, getPreviousMonthRef } from "./monthNames";
