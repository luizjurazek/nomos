import "server-only";
import { getSheetsClient, RETRY_POST_OPTIONS } from "./client";
import { columnIndexToLetter, fetchMonthGridsBatch, quoteSheetTitle } from "./gridIO";
import { getCachedLocation, invalidateLocation } from "./locateTableCache";
import { locateTables } from "./locateTables";
import { findBlankRows } from "./rowExtraction";
import { getSheetIdByTitle, getSheetIdsByTitle } from "./sheetMeta";
import { TABLE_CONFIGS } from "./tableConfigs";
import type { ColumnRole, SheetCell, TableId, TableLocation } from "./types";

async function locateTable(spreadsheetId: string, monthTitle: string, tableId: TableId, options?: { fresh?: boolean }) {
  const { raw, located } = await getCachedLocation(spreadsheetId, monthTitle, options);
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
 * Inserts `count` real rows just above the table's first Total row (shifting it and everything
 * below down), or right after the data range if the table has no Total row at all — in a single
 * `batchUpdate` call, one `insertDimension` request per row, all at the same index: each
 * insertion pushes the previous one down, so the result is `count` consecutive blank rows
 * starting at that index. Uses inheritFromBefore so each new row picks up the formatting
 * (currency, checkbox validation) of the row above it, and — as a courtesy — keeps the sheet's
 * own SUM/SUMIF formulas correct for anyone opening it directly.
 */
async function insertBlankRows(spreadsheetId: string, monthTitle: string, location: TableLocation, count: number): Promise<number[]> {
  const sheets = getSheetsClient();
  const sheetId = await getSheetIdByTitle(spreadsheetId, monthTitle);
  const insertAt = location.totalRows.length > 0 ? location.totalRows[0].row : location.dataEndRow + 1;

  await sheets.spreadsheets.batchUpdate(
    {
      spreadsheetId,
      requestBody: {
        requests: Array.from({ length: count }, () => ({
          insertDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: insertAt, endIndex: insertAt + 1 },
            inheritFromBefore: true,
          },
        })),
      },
    },
    RETRY_POST_OPTIONS,
  );

  return Array.from({ length: count }, (_, i) => insertAt + i);
}

/**
 * Creates several new entries in the given table in one round trip: reuses whatever blank slots
 * are already in the sheet (Entradas/Débitos still have manually pre-padded rows today), inserting
 * new rows only for the remainder — which is the normal path for tables like Nubank/Vale
 * Alimentação-consumo that have no padding at all — then writes every row's values in a single
 * `values.batchUpdate` call instead of one `values.update` per row.
 */
export async function createRows(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  rows: Partial<Record<ColumnRole, SheetCell>>[],
): Promise<number[]> {
  if (rows.length === 0) return [];
  const config = TABLE_CONFIGS[tableId];
  // Blank-slot detection reads cell contents, so never trust a cached grid here.
  const { raw, location } = await locateTable(spreadsheetId, monthTitle, tableId, { fresh: true });

  try {
    const blankRows = findBlankRows(raw, location, config.columnOrder, rows.length);
    const insertedRows = rows.length > blankRows.length ? await insertBlankRows(spreadsheetId, monthTitle, location, rows.length - blankRows.length) : [];
    const targetRows = [...blankRows, ...insertedRows];

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.batchUpdate(
      {
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: targetRows.map((row, i) => ({
            range: rowRange(monthTitle, location, config.columnOrder, row),
            values: [toRowValues(config.columnOrder, rows[i])],
          })),
        },
      },
      RETRY_POST_OPTIONS,
    );

    return targetRows;
  } finally {
    // Even a partial failure (rows inserted, values not written) shifts positions.
    invalidateLocation(spreadsheetId, monthTitle);
  }
}

/**
 * Creates one new entry per month tab, all in the same table, in a fixed number of Sheets calls
 * regardless of how many months there are: one `batchGet` pair to read every tab, at most one
 * structural `batchUpdate` (one `insertDimension` per tab that has no blank slot) and one
 * `values.batchUpdate` for every row. Inserting rows across tabs in one request is safe because
 * each tab has its own row indices — unlike several inserts into the same tab (see `createRows`).
 * The values write is atomic, so either every row is created or none is; the only leftover from a
 * failure is blank inserted rows, which later creations reuse as slots. `entries` must name each
 * month at most once. Returns the written row per month.
 */
export async function createRowsAcrossMonths(
  spreadsheetId: string,
  tableId: TableId,
  entries: { monthTitle: string; values: Partial<Record<ColumnRole, SheetCell>> }[],
): Promise<{ monthTitle: string; row: number }[]> {
  if (entries.length === 0) return [];
  const config = TABLE_CONFIGS[tableId];
  const months = entries.map((entry) => entry.monthTitle);
  if (new Set(months).size !== months.length) {
    throw new Error("createRowsAcrossMonths expects each month at most once.");
  }

  try {
    // A missing tab fails this read, before anything is written.
    const grids = await fetchMonthGridsBatch(spreadsheetId, months);

    const plans = entries.map((entry) => {
      const { formatted, raw } = grids.get(entry.monthTitle)!;
      const location = locateTables(formatted)[tableId];
      if (!location) {
        throw new Error(`Couldn't find the "${config.label}" table in "${entry.monthTitle}". Check the sheet's layout.`);
      }
      const [blankRow] = findBlankRows(raw, location, config.columnOrder, 1);
      return { entry, location, blankRow };
    });

    const needInsert = plans.filter((plan) => plan.blankRow === undefined);
    const insertedRows = new Map<string, number>();
    if (needInsert.length > 0) {
      const sheets = getSheetsClient();
      const sheetIds = await getSheetIdsByTitle(spreadsheetId);
      const requests = needInsert.map(({ entry, location }) => {
        const sheetId = sheetIds.get(entry.monthTitle);
        if (sheetId === undefined) throw new Error(`Tab "${entry.monthTitle}" not found in spreadsheet ${spreadsheetId}.`);
        const insertAt = location.totalRows.length > 0 ? location.totalRows[0].row : location.dataEndRow + 1;
        insertedRows.set(entry.monthTitle, insertAt);
        return {
          insertDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: insertAt, endIndex: insertAt + 1 },
            inheritFromBefore: true,
          },
        };
      });
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } }, RETRY_POST_OPTIONS);
    }

    const targets = plans.map(({ entry, location, blankRow }) => ({
      monthTitle: entry.monthTitle,
      values: entry.values,
      location,
      row: blankRow ?? insertedRows.get(entry.monthTitle)!,
    }));

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.batchUpdate(
      {
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: targets.map((target) => ({
            range: rowRange(target.monthTitle, target.location, config.columnOrder, target.row),
            values: [toRowValues(config.columnOrder, target.values)],
          })),
        },
      },
      RETRY_POST_OPTIONS,
    );

    return targets.map(({ monthTitle, row }) => ({ monthTitle, row }));
  } finally {
    for (const month of months) invalidateLocation(spreadsheetId, month);
  }
}

/** Creates a single new entry in the given table — see `createRows` for how the slot is picked. */
export async function createRow(
  spreadsheetId: string,
  monthTitle: string,
  tableId: TableId,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
): Promise<number> {
  const [row] = await createRows(spreadsheetId, monthTitle, tableId, [valuesByRole]);
  return row;
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

  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange(monthTitle, location, config.columnOrder, rowIndex),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRowValues(config.columnOrder, valuesByRole)] },
    });
  } finally {
    invalidateLocation(spreadsheetId, monthTitle);
  }
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

  // A single-cell write doesn't shift table positions, so the cached location stays valid (createRows always reads fresh).
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

  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange(monthTitle, location, config.columnOrder, rowIndex),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRowValues(config.columnOrder, {})] },
    });
  } finally {
    invalidateLocation(spreadsheetId, monthTitle);
  }
}
