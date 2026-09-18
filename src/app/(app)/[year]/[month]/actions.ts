"use server";

import { revalidatePath } from "next/cache";
import { syncCardRollover } from "@/lib/sheets/cardRollover";
import { createRow, deleteRow, updateCell, updateRow } from "@/lib/sheets/writeRow";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";
import { MONTH_NAMES, getMonthNumber } from "@/lib/sheets/monthNames";
import { formatSheetDate, parseSheetDate } from "@/lib/format/date";
import type { ColumnRole, SheetCell, TableId } from "@/lib/sheets/types";

function revalidateMonth(year: string, month: string) {
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
  revalidateMonth(year, month);
}

/**
 * Creates one row per installment, starting at `month`, each named "<name> (i/N)" following
 * the existing convention that `parseInstallment` reads back on the month pages. `valuesByRole`
 * already carries the per-installment value (not the purchase total) — it's copied as-is onto
 * every row, only `name` and `date` change per installment.
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

  for (const [i, targetMonth] of targetMonths.entries()) {
    const date = baseDate ? formatSheetDate({ ...baseDate, month: getMonthNumber(targetMonth) }) : valuesByRole.date;
    await createRow(spreadsheetId, targetMonth, tableId, {
      ...valuesByRole,
      name: `${baseName} (${i + 1}/${installments})`,
      date,
    });
  }

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
