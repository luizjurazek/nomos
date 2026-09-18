import { indexByKey, monthKey, previousRef, refFromKey, sortMonths, type MonthRef } from "./months";
import type { AnalysisMonth } from "./types";

export type CategoryKind = "saidas" | "entradas";

export interface CategoryOptions {
  kind: CategoryKind;
  /** Savings/investments and reserve withdrawals: off by default, they are not real spending/income. */
  includeTransfers: boolean;
}

export interface CategoryRow {
  categoria: string;
  total: number;
  /** Fraction of the month's total, 0..1. */
  share: number;
  /** Change vs the previous month as a fraction; null when there is nothing to compare with. */
  delta: number | null;
}

export interface CategoryBreakdown {
  total: number;
  rows: CategoryRow[];
}

export const NO_CATEGORY = "Sem categoria";

/**
 * Category totals for one month. Saídas are cash-out: the month's Débitos (minus the auto-synced
 * card line, so the card isn't counted twice) plus the previous month's Nubank purchases, which are
 * what actually gets paid this month.
 */
function totalsFor(byKey: Map<string, AnalysisMonth>, ref: MonthRef, options: CategoryOptions): Map<string, number> {
  const totals = new Map<string, number>();
  const month = byKey.get(monthKey(ref));
  if (!month) return totals;

  const add = (categoria: string, valor: number) => {
    const name = categoria.trim() || NO_CATEGORY;
    totals.set(name, (totals.get(name) ?? 0) + valor);
  };

  if (options.kind === "entradas") {
    for (const row of month.entradas) {
      if (row.isTransfer && !options.includeTransfers) continue;
      add(row.categoria, row.valor);
    }
    return totals;
  }

  for (const row of month.debitos) {
    if (row.isCardRollover) continue;
    if (row.isTransfer && !options.includeTransfers) continue;
    add(row.categoria, row.valor);
  }
  const previous = previousRef(ref);
  const previousMonth = previous ? byKey.get(monthKey(previous)) : undefined;
  for (const row of previousMonth?.nubank ?? []) add(row.categoria, row.valor);
  return totals;
}

export function categoryBreakdown(months: AnalysisMonth[], key: string, options: CategoryOptions): CategoryBreakdown {
  const byKey = indexByKey(months);
  const ref = refFromKey(key);
  const current = totalsFor(byKey, ref, options);

  const previousRefValue = previousRef(ref);
  const hasPrevious = previousRefValue ? byKey.has(monthKey(previousRefValue)) : false;
  const previous = hasPrevious && previousRefValue ? totalsFor(byKey, previousRefValue, options) : null;

  const entries = [...current.entries()].filter(([, total]) => total !== 0);
  const total = entries.reduce((acc, [, value]) => acc + value, 0);

  const rows = entries
    .map(([categoria, value]): CategoryRow => {
      const before = previous?.get(categoria) ?? 0;
      return {
        categoria,
        total: value,
        share: total ? value / total : 0,
        delta: previous && before > 0 ? (value - before) / before : null,
      };
    })
    .sort((a, b) => b.total - a.total);

  return { total, rows };
}

export interface CategoryPoint {
  key: string;
  year: string;
  month: string;
  total: number;
}

/** One category's total for every month tab, oldest first. */
export function categorySeries(months: AnalysisMonth[], categoria: string, options: CategoryOptions): CategoryPoint[] {
  const sorted = sortMonths(months);
  const byKey = indexByKey(sorted);
  return sorted.map((month) => ({
    key: monthKey(month),
    year: month.year,
    month: month.month,
    total: totalsFor(byKey, month, options).get(categoria) ?? 0,
  }));
}
