import "server-only";
import { getSheetsClient } from "./client";

/** Resolves a tab's numeric grid ID (needed for structural edits like inserting rows), given its title. */
export async function getSheetIdByTitle(spreadsheetId: string, title: string): Promise<number> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const match = (response.data.sheets ?? []).find((sheet) => sheet.properties?.title === title);
  if (match?.properties?.sheetId == null) {
    throw new Error(`Tab "${title}" not found in spreadsheet ${spreadsheetId}.`);
  }
  return match.properties.sheetId;
}

/** Resolves every tab's numeric grid ID in one call, keyed by title — for structural edits across several tabs. */
export async function getSheetIdsByTitle(spreadsheetId: string): Promise<Map<string, number>> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)",
  });
  const ids = new Map<string, number>();
  for (const sheet of response.data.sheets ?? []) {
    const { title, sheetId } = sheet.properties ?? {};
    if (title && sheetId != null) ids.set(title, sheetId);
  }
  return ids;
}
