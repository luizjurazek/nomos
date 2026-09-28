import "server-only";
import { getSheetsClient } from "./client";
import { quoteSheetTitle } from "./gridIO";

const CONFIG_TAB = "Config";
const CONFIG_RANGE = "A1:B50";

/**
 * Reads the "Config" tab's key/value rows (col A = label, col B = value). There's no header row —
 * the tab is just label/value pairs from row 1 down. Keys are matched case-insensitively. Meant for
 * one-off settings that don't belong to any month, like a savings balance carried over from before
 * this spreadsheet existed.
 */
export async function readConfigRows(spreadsheetId: string): Promise<Map<string, unknown>> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetTitle(CONFIG_TAB)}!${CONFIG_RANGE}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];

  const entries = new Map<string, unknown>();
  for (const row of rows) {
    const key = String(row[0] ?? "").trim();
    if (!key) continue;
    entries.set(key.toLowerCase(), row[1]);
  }
  return entries;
}
