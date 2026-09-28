import { toNumber } from "../format/currency";
import type { ColumnRole, SheetCell, SheetGrid, TableLocation } from "./types";

export interface RawRow {
  rowIndex: number;
  values: Partial<Record<ColumnRole, SheetCell>>;
}

function readRowValues(
  grid: SheetGrid,
  location: TableLocation,
  columnOrder: ColumnRole[],
  row: number,
): Partial<Record<ColumnRole, SheetCell>> {
  const values: Partial<Record<ColumnRole, SheetCell>> = {};
  columnOrder.forEach((role, i) => {
    values[role] = grid[row]?.[location.startCol + i];
  });
  return values;
}

function isBlankRow(values: Partial<Record<ColumnRole, SheetCell>>): boolean {
  return !values.name && !toNumber(values.valor);
}

/** Extracts every non-blank row within a table's data range, keeping its sheet row index. */
export function extractRawRows(raw: SheetGrid, location: TableLocation, columnOrder: ColumnRole[]): RawRow[] {
  const rows: RawRow[] = [];
  for (let row = location.dataStartRow; row <= location.dataEndRow; row++) {
    const values = readRowValues(raw, location, columnOrder, row);
    if (!isBlankRow(values)) rows.push({ rowIndex: row, values });
  }
  return rows;
}

/** Finds the first empty slot within a table's data range, if any — used before falling back to inserting a new row. */
export function findBlankRow(raw: SheetGrid, location: TableLocation, columnOrder: ColumnRole[]): number | null {
  return findBlankRows(raw, location, columnOrder, 1)[0] ?? null;
}

/** Same as `findBlankRow`, but collects up to `count` empty slots — for writing several rows in one go. */
export function findBlankRows(raw: SheetGrid, location: TableLocation, columnOrder: ColumnRole[], count: number): number[] {
  const rows: number[] = [];
  for (let row = location.dataStartRow; row <= location.dataEndRow && rows.length < count; row++) {
    if (isBlankRow(readRowValues(raw, location, columnOrder, row))) rows.push(row);
  }
  return rows;
}
