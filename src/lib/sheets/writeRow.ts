import "server-only";
import { getSheetsClient } from "./client";
import { columnIndexToLetter, fetchMonthGrids, quoteSheetTitle } from "./gridIO";
import { locateTables } from "./locateTables";
import { findBlankRow } from "./rowExtraction";
import { getSheetIdByTitle } from "./sheetMeta";
import { TABLE_CONFIGS } from "./tableConfigs";
import type { ColumnRole, SheetCell, TableId, TableLocation } from "./types";

async function locateTable(spreadsheetId: string, monthTitle: string, tableId: TableId) {
  const { formatted, raw } = await fetchMonthGrids(spreadsheetId, monthTitle);
  const located = locateTables(formatted);
  const location = located[tableId];
  if (!location) {
    throw new Error(`Couldn't find the "${TABLE_CONFIGS[tableId].label}" table in "${monthTitle}". Check the sheet's layout.`);
  }
  return { raw, location };
}

function rowRange(monthTitle: string, location: TableLocation, columnOrder: ColumnRole[], row: number): string {
  const startLetter = columnIndexToLetter(location.startCol);
  const endLetter = columnIndexToLetter(location.startCol + columnOrder.length - 1);
  return `${quoteSheetTitle(monthTitle)}!${startLetter}${row + 1}:${endLetter}${row + 1}`;
}

function cellRange(monthTitle: string, location: TableLocation, columnOrder: ColumnRole[], row: number, role: ColumnRole): string {
  const colIndex = columnOrder.indexOf(role);
  const letter = columnIndexToLetter(location.startCol + colIndex);
  return `${quoteSheetTitle(monthTitle)}!${letter}${row + 1}`;
}

function toRowValues(columnOrder: ColumnRole[], valuesByRole: Partial<Record<ColumnRole, SheetCell>>): SheetCell[] {
  return columnOrder.map((role) => {
    const value = valuesByRole[role];
    if (role === "checkbox") return value ?? false;
    return value ?? "";
  });
}

/**
 * Inserts a real row just above the table's first Total row (shifting it and everything below
 * down by one), or right after the data range if the table has no Total row at all. Uses
 * inheritFromBefore so the new row picks up the formatting (currency, checkbox validation) of
 * the row above it, and — as a courtesy — keeps the sheet's own SUM/SUMIF formulas correct for
 * anyone opening it directly.
 */
async function insertBlankRow(spreadsheetId: string, monthTitle: string, location: TableLocation): Promise<number> {
  const sheets = getSheetsClient();
  const sheetId = await getSheetIdByTitle(spreadsheetId, monthTitle);
  const insertAt = location.totalRows.length > 0 ? location.totalRows[0].row : location.dataEndRow + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: insertAt, endIndex: insertAt + 1 },
            inheritFromBefore: true,
          },
        },
      ],
    },
  });

  return insertAt;
}

/**
 * Creates a new entry in the given table: reuses the first blank slot already in the sheet
 * (Entradas/Débitos still have manually pre-padded rows today), or inserts a brand-new row when
 * none is free — which is the normal path for tables like Nubank/Vale Alimentação-consumo that
 * have no padding at all. Either way, the user never has to pre-create blank rows by hand.
 */
export async function createRow(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
): Promise<number> {
  const config = TABLE_CONFIGS[tableId];
  const { raw, location } = await locateTable(spreadsheetId, monthTitle, tableId);

  const blankRow = findBlankRow(raw, location, config.columnOrder);
  const targetRow = blankRow ?? (await insertBlankRow(spreadsheetId, monthTitle, location));

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: rowRange(monthTitle, location, config.columnOrder, targetRow),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [toRowValues(config.columnOrder, valuesByRole)] },
  });

  return targetRow;
}

/** Overwrites an existing row's full contents (used by edit forms). */
export async function updateRow(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  rowIndex: number,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
): Promise<void> {
  const config = TABLE_CONFIGS[tableId];
  const { location } = await locateTable(spreadsheetId, monthTitle, tableId);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: rowRange(monthTitle, location, config.columnOrder, rowIndex),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [toRowValues(config.columnOrder, valuesByRole)] },
  });
}

/** Updates a single field (e.g. toggling the Pago/Recebido checkbox) with a minimal single-cell write. */
export async function updateCell(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  rowIndex: number,
  role: ColumnRole,
  value: SheetCell,
): Promise<void> {
  const config = TABLE_CONFIGS[tableId];
  const { location } = await locateTable(spreadsheetId, monthTitle, tableId);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRange(monthTitle, location, config.columnOrder, rowIndex, role),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value ?? ""]] },
  });
}

/** Clears a row's contents rather than physically removing it, preserving the sheet's slot-based layout. */
export async function deleteRow(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  rowIndex: number,
): Promise<void> {
  const config = TABLE_CONFIGS[tableId];
  const { location } = await locateTable(spreadsheetId, monthTitle, tableId);

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: rowRange(monthTitle, location, config.columnOrder, rowIndex),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [toRowValues(config.columnOrder, {})] },
  });
}
