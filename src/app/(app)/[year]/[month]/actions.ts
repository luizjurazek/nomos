"use server";

import { revalidatePath, updateTag } from "next/cache";
import { syncCardRollover } from "@/lib/sheets/cardRollover";
import { createRow, createRows, createRowsAcrossMonths, deleteRow, updateCell, updateRow } from "@/lib/sheets/writeRow";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";
import { CARD_ADJUSTMENT_CATEGORY } from "@/lib/sheets/tableConfigs";
import { MONTH_NAMES, getMonthNumber } from "@/lib/sheets/monthNames";
import { formatSheetDate, parseSheetDate } from "@/lib/format/date";
import { monthGridsCacheTag } from "@/lib/sheets/cacheTags";
import type { ColumnRole, SheetCell, TableId } from "@/lib/sheets/types";

function revalidateMonth(year: string, month: string) {
  updateTag(monthGridsCacheTag(year, month));
  revalidatePath(`/${year}/${month}`);
}

export async function createEntry(
  year: string,
  month: string,
  tableId: TableId,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  await createRow(spreadsheetId, month, tableId, valuesByRole);
  // A card discount also gets a matching negative line in this month's Nubank, so next month's
  // auto-sync (which sums this month's Nubank total) carries the discount forward on its own.
  if (tableId === "debitos" && valuesByRole.category === CARD_ADJUSTMENT_CATEGORY) {
    await createRow(spreadsheetId, month, "nubank", {
      date: valuesByRole.date,
      name: valuesByRole.name,
      category: CARD_ADJUSTMENT_CATEGORY,
      quem: valuesByRole.quem,
      valor: valuesByRole.valor,
    });
  }
  revalidateMonth(year, month);
}

export interface BatchEntry {
  tableId: TableId;
  values: Partial<Record<ColumnRole, SheetCell>>;
}

/**
 * Creates several entries in `month` in as few Sheets calls as possible: entries are grouped by
 * table and each group goes through `createRows` (one insert `batchUpdate` + one values
 * `batchUpdate` per table, instead of a read+insert+write round trip per row). Groups are still
 * written one after another — concurrent inserts into the same tab would shift row indices out
 * from under each other's already-located blank rows.
 */
export async function createEntries(year: string, month: string, entries: BatchEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const spreadsheetId = getSpreadsheetId(year);

  const rowsByTable = new Map<TableId, Partial<Record<ColumnRole, SheetCell>>[]>();
  const addRow = (tableId: TableId, values: Partial<Record<ColumnRole, SheetCell>>) => {
    const rows = rowsByTable.get(tableId) ?? [];
    rows.push(values);
    rowsByTable.set(tableId, rows);
  };

  for (const entry of entries) {
    addRow(entry.tableId, entry.values);
    // Same mirroring as createEntry: a card discount also gets a matching negative line in Nubank.
    if (entry.tableId === "debitos" && entry.values.category === CARD_ADJUSTMENT_CATEGORY) {
      addRow("nubank", {
        date: entry.values.date,
        name: entry.values.name,
        category: CARD_ADJUSTMENT_CATEGORY,
        quem: entry.values.quem,
        valor: entry.values.valor,
      });
    }
  }

  for (const [tableId, rows] of rowsByTable) {
    await createRows(spreadsheetId, month, tableId, rows);
  }
  revalidateMonth(year, month);
}

/**
 * Creates one row per installment, starting at `month`, each named "<name> (i/N)" following
 * the existing convention that `parseInstallment` reads back on the month pages. `valuesByRole`
 * already carries the per-installment value (not the purchase total) — it's copied as-is onto
 * every row, only `name` and `date` change per installment. All rows go out in one batched,
 * atomic write (each installment lives in a different tab), so a failure never leaves a plan
 * half created.
 *
 * Attention point: a plan that would run past Dezembro isn't supported yet, because each year
 * lives in its own spreadsheet (see spreadsheetRegistry.ts) and the next year's tabs may not
 * exist. A December purchase paid into January needs manual entry in the next year's sheet for
 * now — revisit once cross-year spreadsheets can be resolved/created from here.
 */
export async function createInstallmentEntries(
  year: string,
  month: string,
  tableId: TableId,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
  installments: number,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  const startIndex = MONTH_NAMES.findIndex((name) => name.toLowerCase() === month.trim().toLowerCase());
  if (startIndex === -1) {
    throw new Error(`Mês "${month}" não reconhecido.`);
  }
  if (installments < 2) {
    throw new Error("Número de parcelas precisa ser maior que 1.");
  }
  if (startIndex + installments > MONTH_NAMES.length) {
    throw new Error(
      "Parcelamento que passa de dezembro para o próximo ano ainda não é suportado. Lance as parcelas restantes manualmente na planilha do próximo ano quando ela existir.",
    );
  }

  const baseName = String(valuesByRole.name ?? "").trim();
  const baseDate = parseSheetDate(String(valuesByRole.date ?? ""));
  const targetMonths = MONTH_NAMES.slice(startIndex, startIndex + installments);

  // One entry per month tab, written in a single batch (all or nothing) — see createRowsAcrossMonths.
  await createRowsAcrossMonths(
    spreadsheetId,
    tableId,
    targetMonths.map((targetMonth, i) => ({
      monthTitle: targetMonth,
      values: {
        ...valuesByRole,
        name: `${baseName} (${i + 1}/${installments})`,
        date: baseDate ? formatSheetDate({ ...baseDate, month: getMonthNumber(targetMonth) }) : valuesByRole.date,
      },
    })),
  );

  targetMonths.forEach((targetMonth) => revalidateMonth(year, targetMonth));
}

export async function updateEntry(
  year: string,
  month: string,
  tableId: TableId,
  rowIndex: number,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  await updateRow(spreadsheetId, month, tableId, rowIndex, valuesByRole);
  revalidateMonth(year, month);
}

export async function deleteEntry(year: string, month: string, tableId: TableId, rowIndex: number): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  await deleteRow(spreadsheetId, month, tableId, rowIndex);
  revalidateMonth(year, month);
}

export async function toggleChecked(
  year: string,
  month: string,
  tableId: TableId,
  rowIndex: number,
  value: boolean,
): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  await updateCell(spreadsheetId, month, tableId, rowIndex, "checkbox", value);
  revalidateMonth(year, month);
}

/**
 * Keeps the "Cartão de crédito" row in Débitos equal to the previous month's Nubank total. Fired by
 * the month screen after it mounts (instead of during render), and only refreshes the page when the
 * sheet actually changed.
 */
export async function syncCardRolloverAction(year: string, month: string): Promise<void> {
  const spreadsheetId = getSpreadsheetId(year);
  const changed = await syncCardRollover(spreadsheetId, year, month);
  if (changed) revalidateMonth(year, month);
}
