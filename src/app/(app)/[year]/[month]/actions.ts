"use server";

import { revalidatePath, updateTag } from "next/cache";
import { readBalanceTransferPlan, writeBalanceTransfer } from "@/lib/sheets/balanceTransferPlan";
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
 * every row, only `name` and `date` change per installment.
 *
 * Plans that run past Dezembro continue into Janeiro onward of the following years, which live in
 * their own spreadsheets (see spreadsheetRegistry.ts). Every needed year's spreadsheet is resolved
 * up front, so a year that isn't configured fails before anything is written. Within one year the
 * write is a single atomic batch (see createRowsAcrossMonths); across years the batches run one
 * after another, later years first, so a missing tab in a future year aborts before the current
 * year is touched.
 */
export async function createInstallmentEntries(
  year: string,
  month: string,
  tableId: TableId,
  valuesByRole: Partial<Record<ColumnRole, SheetCell>>,
  installments: number,
): Promise<void> {
  const startIndex = MONTH_NAMES.findIndex((name) => name.toLowerCase() === month.trim().toLowerCase());
  if (startIndex === -1) {
    throw new Error(`Mês "${month}" não reconhecido.`);
  }
  if (installments < 2) {
    throw new Error("Número de parcelas precisa ser maior que 1.");
  }

  const baseName = String(valuesByRole.name ?? "").trim();
  const baseDate = parseSheetDate(String(valuesByRole.date ?? ""));

  const entriesByYear = new Map<string, { monthTitle: string; values: Partial<Record<ColumnRole, SheetCell>> }[]>();
  for (let i = 0; i < installments; i++) {
    const absoluteMonth = startIndex + i;
    const targetYear = String(Number(year) + Math.floor(absoluteMonth / MONTH_NAMES.length));
    const monthTitle = MONTH_NAMES[absoluteMonth % MONTH_NAMES.length];
    const entries = entriesByYear.get(targetYear) ?? [];
    entries.push({
      monthTitle,
      values: {
        ...valuesByRole,
        name: `${baseName} (${i + 1}/${installments})`,
        date: baseDate
          ? formatSheetDate({ ...baseDate, month: getMonthNumber(monthTitle), year: targetYear })
          : valuesByRole.date,
      },
    });
    entriesByYear.set(targetYear, entries);
  }

  // Resolve every spreadsheet before writing anything.
  const spreadsheetIds = new Map<string, string>();
  for (const targetYear of entriesByYear.keys()) {
    try {
      spreadsheetIds.set(targetYear, getSpreadsheetId(targetYear));
    } catch {
      throw new Error(`Não existe planilha configurada para ${targetYear}, necessária para as parcelas restantes.`);
    }
  }

  const years = [...entriesByYear.keys()].sort().reverse();
  for (const targetYear of years) {
    const entries = entriesByYear.get(targetYear)!;
    await createRowsAcrossMonths(spreadsheetIds.get(targetYear)!, tableId, entries);
    entries.forEach((entry) => revalidateMonth(targetYear, entry.monthTitle));
  }
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

/**
 * Moves the previous month's leftover (current balance and food voucher) into `month`. Plans again from a
 * fresh read instead of trusting what the screen showed, so a double tap or a second device can't write
 * the same transfer twice; a transfer that stopped halfway is finished from where it stopped.
 */
export async function applyBalanceTransferAction(year: string, month: string): Promise<{ error: string | null }> {
  const plan = await readBalanceTransferPlan(year, month, { fresh: true });
  if (!plan || plan.legs.length === 0) return { error: null };
  try {
    await writeBalanceTransfer(plan);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro desconhecido ao escrever na planilha." };
  } finally {
    revalidateMonth(plan.from.year, plan.from.month);
    revalidateMonth(plan.to.year, plan.to.month);
  }
}
