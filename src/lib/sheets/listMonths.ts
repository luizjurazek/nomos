import "server-only";
import { getSheetsClient } from "./client";
import { monthIndex } from "./monthNames";

const NON_MONTH_TABS = new Set(["dados"]);

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

export { MONTH_NAMES, getAdjacentMonth, getMonthNumber, getPreviousMonthRef } from "./monthNames";
