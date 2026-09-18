import "server-only";
import { getSheetsClient } from "./client";
import type { SheetGrid } from "./types";

/** How many rows/columns of a month tab we read — generous enough to cover any table's padding. */
export const GRID_RANGE = "A1:U300";

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

async function readGrid(
  spreadsheetId: string,
  sheetTitle: string,
  valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE",
): Promise<SheetGrid> {
  const sheets = getSheetsClient();
  const range = `${quoteSheetTitle(sheetTitle)}!${GRID_RANGE}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption,
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return (response.data.values ?? []) as SheetGrid;
}

/**
 * Reads a month tab twice: once formatted (for locating blocks/headers/totals by their text)
 * and once unformatted (for the actual numeric/boolean data), so we never have to hand-parse
 * pt-BR currency strings like "R$ 1.600,00".
 */
export async function fetchMonthGrids(
  spreadsheetId: string,
  sheetTitle: string,
): Promise<{ formatted: SheetGrid; raw: SheetGrid }> {
  const [formatted, raw] = await Promise.all([
    readGrid(spreadsheetId, sheetTitle, "FORMATTED_VALUE"),
    readGrid(spreadsheetId, sheetTitle, "UNFORMATTED_VALUE"),
  ]);
  return { formatted, raw };
}

export function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export { quoteSheetTitle };
