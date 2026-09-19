import { baseName } from "../analysis/installments";
import { formatSheetDate, parseSheetDate, UNKNOWN_DAY_PLACEHOLDER } from "../format/date";
import type { Installment } from "../format/installment";
import { getMonthNumber } from "./monthNames";
import type { ColumnRole, SheetCell } from "./types";

/** The tables whose rows can carry an installment marker. */
export type CarryTableId = "entradas" | "debitos" | "nubank";

/** A row of Entradas, Débitos or Nubank reduced to what carrying an installment over needs. */
export interface CarryRow {
  name: string;
  valor: number;
  categoria: string;
  /** Empty for Entradas, which has no such column. */
  quem: string;
  date: string;
  installment: Installment | null;
  /** The auto-synced "Cartão de crédito" line: never an installment, never carried. */
  isCardRollover?: boolean;
}

/** The next installment of a plan, ready to be written into a month that does not have it yet. */
export interface PendingInstallment {
  year: string;
  month: string;
  tableId: CarryTableId;
  name: string;
  valor: number;
  current: number;
  total: number;
  values: Partial<Record<ColumnRole, SheetCell>>;
}

/** "Carro 47/58" -> "Carro 48/58", "Fone (2/3)" -> "Fone (3/3)", "47/58 Carro" -> "48/58 Carro": only the digits change. */
export function bumpInstallmentName(name: string, next: number): string {
  return name.replace(/\b(\d{1,3})(\s*\/\s*)(\d{1,3})\b/, `${next}$2$3`);
}

/** Same day in the target month (clamped to its length, so the 31st becomes the 28th in Fevereiro); the "xx" placeholder stays a placeholder. */
export function shiftSheetDate(date: string, year: string, month: string): string {
  const monthNumber = getMonthNumber(month);
  const parsed = parseSheetDate(date);
  if (!parsed || !parsed.dayKnown) return `${UNKNOWN_DAY_PLACEHOLDER}/${monthNumber}/${year}`;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(monthNumber), 0)).getUTCDate();
  const day = String(Math.min(Number(parsed.day), daysInMonth)).padStart(2, "0");
  return formatSheetDate({ dayKnown: true, day, month: monthNumber, year });
}

const planKey = (name: string, total: number) => `${baseName(name).toLowerCase()}|${total}`;

/**
 * The installments of `source` (the previous month's table) that `target` (the same table in the month
 * that follows) does not have yet: every plan that still has charges left. A plan counts as already
 * there when the target has a row with the same name and total, whatever its number or value, so a row
 * typed by hand (or a value that changed) is never duplicated.
 */
export function pendingInstallments(
  tableId: CarryTableId,
  source: CarryRow[],
  target: CarryRow[],
  ref: { year: string; month: string },
): PendingInstallment[] {
  const present = new Set(target.flatMap((row) => (row.installment ? [planKey(row.name, row.installment.total)] : [])));
  const pending: PendingInstallment[] = [];
  for (const row of source) {
    const { installment } = row;
    if (row.isCardRollover || !installment || installment.current >= installment.total) continue;
    const key = planKey(row.name, installment.total);
    if (present.has(key)) continue;
    present.add(key);
    const current = installment.current + 1;
    const name = bumpInstallmentName(row.name, current);
    pending.push({
      ...ref,
      tableId,
      name,
      valor: row.valor,
      current,
      total: installment.total,
      values: {
        date: shiftSheetDate(row.date, ref.year, ref.month),
        name,
        category: row.categoria,
        quem: row.quem,
        valor: row.valor,
        checkbox: false,
      },
    });
  }
  return pending;
}
