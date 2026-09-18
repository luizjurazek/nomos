import "server-only";
import { getSheetsClient } from "../sheets/client";
import { GRID_RANGE, quoteSheetTitle } from "../sheets/gridIO";
import { listMonths } from "../sheets/listMonths";
import type { SheetGrid } from "../sheets/types";
import { parseMonth } from "./parseMonth";
import type { AnalysisMonth } from "./types";

async function batchGrids(
  spreadsheetId: string,
  ranges: string[],
  valueRenderOption: "FORMATTED_VALUE" | "UNFORMATTED_VALUE",
): Promise<SheetGrid[]> {
  const response = await getSheetsClient().spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
    valueRenderOption,
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  // Responses come back in the same order as `ranges`.
  return (response.data.valueRanges ?? []).map((valueRange) => (valueRange.values ?? []) as SheetGrid);
}

/**
 * Reads every month tab of a year's spreadsheet in 3 API calls (tab list + one batchGet per render
 * option) instead of the 2-per-month the month page does.
 */
export async function readYear(spreadsheetId: string, year: string): Promise<AnalysisMonth[]> {
  const months = await listMonths(spreadsheetId);
  if (months.length === 0) return [];

  const ranges = months.map((month) => `${quoteSheetTitle(month)}!${GRID_RANGE}`);
  const [formatted, raw] = await Promise.all([
    batchGrids(spreadsheetId, ranges, "FORMATTED_VALUE"),
    batchGrids(spreadsheetId, ranges, "UNFORMATTED_VALUE"),
  ]);

  return months.map((month, index) => parseMonth(year, month, formatted[index] ?? [], raw[index] ?? []));
}
