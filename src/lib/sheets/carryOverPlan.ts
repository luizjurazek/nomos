import "server-only";
import { listMonths } from "./listMonths";
import { MONTH_NAMES, getCurrentYearMonth, monthIndex } from "./monthNames";
import { readMonth } from "./readMonth";
import { getSpreadsheetId, listAvailableYears } from "./spreadsheetRegistry";
import { pendingInstallments, type CarryRow, type CarryTableId, type PendingInstallment } from "./carryOver";
import { createRow } from "./writeRow";

type MonthRows = Record<CarryTableId, CarryRow[]>;

/** Months as a single number (year * 12 + month index) so "the previous month" is just n − 1, across years too. */
const ordinal = (year: string, index: number) => Number(year) * 12 + index;
const yearOf = (n: number) => String(Math.floor(n / 12));
const monthOf = (n: number) => MONTH_NAMES[n % 12];

async function loadRows(n: number): Promise<MonthRows> {
  const year = yearOf(n);
  const data = await readMonth(getSpreadsheetId(year), year, monthOf(n));
  return {
    entradas: data.entradas.map((row) => ({ ...row, quem: "" })),
    debitos: data.debitos.map((row) => ({ ...row, quem: String(row.quem) })),
    nubank: data.nubank.map((row) => ({ ...row, quem: String(row.quem) })),
  };
}

/**
 * Every installment a month is missing, from the current month on, given that the previous month has
 * a tab to copy from. Months are walked in order and each one's new rows count as present for the next,
 * so a plan running through several empty tabs (or across the year boundary, Dezembro -> Janeiro) is
 * filled in one go. Past months are left alone. Read-only: nothing is written here.
 */
export async function planPendingInstallments(): Promise<PendingInstallment[]> {
  const now = getCurrentYearMonth();
  const tabs = new Set<number>();
  for (const year of listAvailableYears()) {
    for (const month of await listMonths(getSpreadsheetId(year))) tabs.add(ordinal(year, monthIndex(month)));
  }

  const rowsByMonth = new Map<number, MonthRows>();
  const pending: PendingInstallment[] = [];
  const targets = [...tabs].filter((n) => n >= now.year * 12 + now.monthIndex).sort((a, b) => a - b);

  for (const n of targets) {
    if (!tabs.has(n - 1)) continue;
    const source = rowsByMonth.get(n - 1) ?? (await loadRows(n - 1));
    const target = rowsByMonth.get(n) ?? (await loadRows(n));
    rowsByMonth.set(n - 1, source);

    const ref = { year: yearOf(n), month: monthOf(n) };
    const added: MonthRows = { entradas: [], debitos: [], nubank: [] };
    for (const tableId of ["entradas", "debitos", "nubank"] as const) {
      for (const item of pendingInstallments(tableId, source[tableId], target[tableId], ref)) {
        pending.push(item);
        added[tableId].push({
          name: item.name,
          valor: item.valor,
          categoria: String(item.values.category ?? ""),
          quem: String(item.values.quem ?? ""),
          date: String(item.values.date ?? ""),
          installment: { current: item.current, total: item.total },
        });
      }
    }
    rowsByMonth.set(n, {
      entradas: [...target.entradas, ...added.entradas],
      debitos: [...target.debitos, ...added.debitos],
      nubank: [...target.nubank, ...added.nubank],
    });
  }
  return pending;
}

/** Writes the given rows one by one, in order. Stops at the first failure, so what was written is exactly the first `created` items. */
export async function writePendingInstallments(items: PendingInstallment[]): Promise<{ created: number; error: string | null }> {
  let created = 0;
  try {
    for (const item of items) {
      await createRow(getSpreadsheetId(item.year), item.month, item.tableId, item.values);
      created++;
    }
  } catch (error) {
    return { created, error: error instanceof Error ? error.message : "Erro desconhecido ao escrever na planilha." };
  }
  return { created, error: null };
}
