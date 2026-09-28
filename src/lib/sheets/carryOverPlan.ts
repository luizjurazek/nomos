import "server-only";
import { listMonths } from "./listMonths";
import { MONTH_NAMES, getCurrentYearMonth, monthIndex } from "./monthNames";
import { readMonths } from "./readMonth";
import { getSpreadsheetId, listAvailableYears } from "./spreadsheetRegistry";
import { pendingInstallments, type CarryRow, type CarryTableId, type PendingInstallment } from "./carryOver";
import type { MonthData } from "./types";
import { createRows } from "./writeRow";

type MonthRows = Record<CarryTableId, CarryRow[]>;

/** Months as a single number (year * 12 + month index) so "the previous month" is just n − 1, across years too. */
const ordinal = (year: string, index: number) => Number(year) * 12 + index;
const yearOf = (n: number) => String(Math.floor(n / 12));
const monthOf = (n: number) => MONTH_NAMES[n % 12];

function toMonthRows(data: MonthData): MonthRows {
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

  const targets = [...tabs].filter((n) => n >= now.year * 12 + now.monthIndex).sort((a, b) => a - b);

  // Every month that will be read as either a source or a target, grouped by spreadsheet (year)
  // so each year's months are fetched together in 2 `batchGet` requests instead of 2 per month.
  const needed = new Map<string, Set<number>>();
  for (const n of targets) {
    if (!tabs.has(n - 1)) continue;
    for (const m of [n - 1, n]) {
      const year = yearOf(m);
      (needed.get(year) ?? needed.set(year, new Set()).get(year)!).add(m);
    }
  }

  const rowsByMonth = new Map<number, MonthRows>();
  await Promise.all(
    [...needed.entries()].map(async ([year, months]) => {
      const ordinals = [...months];
      const data = await readMonths(getSpreadsheetId(year), year, ordinals.map(monthOf));
      for (const m of ordinals) {
        const monthData = data.get(monthOf(m));
        if (monthData) rowsByMonth.set(m, toMonthRows(monthData));
      }
    }),
  );

  const pending: PendingInstallment[] = [];
  for (const n of targets) {
    if (!tabs.has(n - 1)) continue;
    const source = rowsByMonth.get(n - 1);
    const target = rowsByMonth.get(n);
    if (!source || !target) continue;

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

/**
 * `planPendingInstallments` already emits items grouped by month and table (it walks one target
 * month at a time, one table at a time), so consecutive runs sharing (year, month, tableId) can be
 * written together in one `createRows` call without changing the order things are written in.
 */
function groupConsecutive(items: PendingInstallment[]): PendingInstallment[][] {
  const groups: PendingInstallment[][] = [];
  for (const item of items) {
    const last = groups.at(-1)?.at(-1);
    if (last && last.year === item.year && last.month === item.month && last.tableId === item.tableId) {
      groups.at(-1)!.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

/** Writes the given rows a month/table group at a time. Stops at the first failure, so what was written is exactly the first `created` items. */
export async function writePendingInstallments(items: PendingInstallment[]): Promise<{ created: number; error: string | null }> {
  let created = 0;
  try {
    for (const group of groupConsecutive(items)) {
      const { year, month, tableId } = group[0];
      await createRows(getSpreadsheetId(year), month, tableId, group.map((item) => item.values));
      created += group.length;
    }
  } catch (error) {
    return { created, error: error instanceof Error ? error.message : "Erro desconhecido ao escrever na planilha." };
  }
  return { created, error: null };
}
