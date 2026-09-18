import { TABLE_CONFIGS } from "./tableConfigs";
import type { SheetGrid, TableId, TableLocation, TotalRowLocation } from "./types";

const normalize = (value: unknown): string => String(value ?? "").trim().toLowerCase();

function cellText(grid: SheetGrid, row: number, col: number): string {
  return String(grid[row]?.[col] ?? "").trim();
}

/** Scans row 0 for a block whose title matches `titleMatch`, returning its start column. */
function findBlockStartCol(grid: SheetGrid, titleMatch: (text: string) => boolean): number | null {
  const titleRow = grid[0] ?? [];
  for (let col = 0; col < titleRow.length; col++) {
    if (titleMatch(cellText(grid, 0, col))) return col;
  }
  return null;
}

/** Scans downward for the first row whose cells (within [startCol, endCol]) equal `labels`, case-insensitively. */
function findHeaderRow(
  grid: SheetGrid,
  fromRow: number,
  startCol: number,
  labels: string[],
): number | null {
  const wanted = labels.map(normalize);
  for (let row = fromRow; row < grid.length; row++) {
    let matches = true;
    for (let i = 0; i < wanted.length; i++) {
      if (normalize(grid[row]?.[startCol + i]) !== wanted[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return row;
  }
  return null;
}

/**
 * Scans downward from `fromRow` for the sequence of "Total..." rows described by `prefixes`,
 * matched against the first column of the block. Real month tabs place consecutive total rows
 * (e.g. "Total pago" then "Total previsto") immediately after one another, so once the first
 * prefix is found we only check the very next row for the second one.
 */
function findTotalRows(
  grid: SheetGrid,
  fromRow: number,
  startCol: number,
  prefixes: string[],
): TotalRowLocation[] {
  if (prefixes.length === 0) return [];
  const found: TotalRowLocation[] = [];
  let firstRow: number | null = null;
  for (let row = fromRow; row < grid.length; row++) {
    if (normalize(grid[row]?.[startCol]).startsWith(prefixes[0])) {
      firstRow = row;
      break;
    }
  }
  if (firstRow === null) return [];
  found.push({ label: cellText(grid, firstRow, startCol), row: firstRow });

  for (let i = 1; i < prefixes.length; i++) {
    const candidateRow = firstRow + i;
    if (normalize(grid[candidateRow]?.[startCol]).startsWith(prefixes[i])) {
      found.push({ label: cellText(grid, candidateRow, startCol), row: candidateRow });
    } else {
      break;
    }
  }
  return found;
}

export interface LocateTablesOptions {
  /** Last row (0-indexed) to consider when a table has no explicit "Total" row terminating it. */
  maxRow?: number;
}

/**
 * Locates the 5 editable tables within a single month tab's grid, without assuming fixed
 * row/column numbers: blocks are found by their row-1 title, headers by their label text,
 * and data ranges by the "Total..." row(s) that follow (or the end of the grid, for tables
 * that don't have one, like Nubank/Vale Alimentação-consumo in months with no padding).
 */
export function locateTables(grid: SheetGrid, options: LocateTablesOptions = {}): Partial<Record<TableId, TableLocation>> {
  const maxRow = options.maxRow ?? grid.length - 1;
  const result: Partial<Record<TableId, TableLocation>> = {};

  for (const tableId of ["entradas", "debitos", "nubank"] as const) {
    const config = TABLE_CONFIGS[tableId];
    if (!config.titleMatch) continue;
    const startCol = findBlockStartCol(grid, config.titleMatch);
    if (startCol === null) continue;
    const endCol = startCol + config.headerLabels.length - 1;
    const headerRow = findHeaderRow(grid, 1, startCol, config.headerLabels);
    if (headerRow === null) continue;
    const totalRows = findTotalRows(grid, headerRow + 1, startCol, config.totalRowPrefixes);
    const dataEndRow = totalRows.length > 0 ? totalRows[0].row - 1 : maxRow;
    result[tableId] = {
      tableId,
      startCol,
      endCol,
      headerRow,
      dataStartRow: headerRow + 1,
      dataEndRow,
      totalRows,
    };
  }

  // Vale Alimentação reuses the Entradas column block, stacked below it.
  const entradas = result.entradas;
  if (entradas) {
    const { startCol, endCol } = entradas;
    const consumoConfig = TABLE_CONFIGS.valeAlimentacaoConsumo;
    const searchFrom =
      entradas.totalRows.length > 0
        ? entradas.totalRows[entradas.totalRows.length - 1].row + 1
        : entradas.dataEndRow + 1;
    const consumoHeaderRow = findHeaderRow(grid, searchFrom, startCol, consumoConfig.headerLabels);

    if (consumoHeaderRow !== null) {
      const creditoDataEndRow = consumoHeaderRow - 1;
      result.valeAlimentacaoCredito = {
        tableId: "valeAlimentacaoCredito",
        startCol,
        endCol,
        headerRow: null,
        dataStartRow: searchFrom,
        dataEndRow: creditoDataEndRow,
        totalRows: [],
      };

      const consumoTotalRows = findTotalRows(grid, consumoHeaderRow + 1, startCol, consumoConfig.totalRowPrefixes);
      const consumoDataEndRow = consumoTotalRows.length > 0 ? consumoTotalRows[0].row - 1 : maxRow;
      result.valeAlimentacaoConsumo = {
        tableId: "valeAlimentacaoConsumo",
        startCol,
        endCol,
        headerRow: consumoHeaderRow,
        dataStartRow: consumoHeaderRow + 1,
        dataEndRow: consumoDataEndRow,
        totalRows: consumoTotalRows,
      };
    }
  }

  return result;
}
