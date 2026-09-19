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
  /**
   * A savings category (Investimentos, Res. Emergência as a débito): money set aside, not spent, so
   * saving more than the month before is good news. Only ever true for saídas.
   */
  isSavings: boolean;
}

export interface CategoryBreakdown {
  total: number;
  rows: CategoryRow[];
}

export const NO_CATEGORY = "Sem categoria";

interface MonthTotals {
  totals: Map<string, number>;
  /** Names of the categories in `totals` that are savings. */
  savings: Set<string>;
}

/**
 * Category totals for one month. Saídas are cash-out: the month's Débitos (minus the auto-synced
 * card line, so the card isn't counted twice) plus the previous month's Nubank purchases, which are
 * what actually gets paid this month.
 */
function totalsFor(byKey: Map<string, AnalysisMonth>, ref: MonthRef, options: CategoryOptions): MonthTotals {
  const totals = new Map<string, number>();
  const savings = new Set<string>();
  const month = byKey.get(monthKey(ref));
  if (!month) return { totals, savings };

  const add = (categoria: string, valor: number) => {
    const name = categoria.trim() || NO_CATEGORY;
    totals.set(name, (totals.get(name) ?? 0) + valor);
  };

  if (options.kind === "entradas") {
    for (const row of month.entradas) {
      if (row.isTransfer && !options.includeTransfers) continue;
      add(row.categoria, row.valor);
    }
    return { totals, savings };
  }

  for (const row of month.debitos) {
    if (row.isCardRollover) continue;
    if (row.isTransfer && !options.includeTransfers) continue;
    if (row.isTransfer) savings.add(row.categoria.trim() || NO_CATEGORY);
    add(row.categoria, row.valor);
  }
  const previous = previousRef(ref);
  const previousMonth = previous ? byKey.get(monthKey(previous)) : undefined;
  for (const row of previousMonth?.nubank ?? []) add(row.categoria, row.valor);
  return { totals, savings };
}

export function categoryBreakdown(months: AnalysisMonth[], key: string, options: CategoryOptions): CategoryBreakdown {
  const byKey = indexByKey(months);
  const ref = refFromKey(key);
  const { totals: current, savings } = totalsFor(byKey, ref, options);

  const previousRefValue = previousRef(ref);
  const hasPrevious = previousRefValue ? byKey.has(monthKey(previousRefValue)) : false;
  const previous = hasPrevious && previousRefValue ? totalsFor(byKey, previousRefValue, options).totals : null;

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
        isSavings: savings.has(categoria),
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
    total: totalsFor(byKey, month, options).totals.get(categoria) ?? 0,
  }));
}

export interface PeriodCategoryRow {
  categoria: string;
  total: number;
  /** Average per month with a tab in the period. */
  average: number;
  /** Fraction of the period's total, 0..1. */
  share: number;
  isSavings: boolean;
}

export interface PeriodBreakdown {
  total: number;
  /** Months of the period that actually have a tab (only those have categories). */
  monthsCount: number;
  rows: PeriodCategoryRow[];
}

/** Category totals summed over several months, ranked. Months without a tab are skipped. */
export function categoryBreakdownForPeriod(months: AnalysisMonth[], keys: string[], options: CategoryOptions): PeriodBreakdown {
  const byKey = indexByKey(months);
  const present = keys.filter((key) => byKey.has(key));
  const totals = new Map<string, number>();
  const savings = new Set<string>();

  for (const key of present) {
    const month = totalsFor(byKey, refFromKey(key), options);
    for (const [categoria, value] of month.totals) totals.set(categoria, (totals.get(categoria) ?? 0) + value);
    for (const categoria of month.savings) savings.add(categoria);
  }

  const entries = [...totals.entries()].filter(([, value]) => value !== 0);
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  const monthsCount = present.length;

  const rows = entries
    .map(([categoria, value]): PeriodCategoryRow => ({
      categoria,
      total: value,
      average: monthsCount ? value / monthsCount : 0,
      share: total ? value / total : 0,
      isSavings: savings.has(categoria),
    }))
    .sort((a, b) => b.total - a.total);

  return { total, monthsCount, rows };
}

export const OTHER_CATEGORIES = "Outras";

export interface MatrixCategory {
  categoria: string;
  /** Value per month, aligned with `CategoryMatrix.keys`. */
  totals: number[];
  total: number;
  isSavings: boolean;
  /** The bucket that groups every category beyond `topN`. */
  isOther: boolean;
}

export interface CategoryMatrix {
  /** Months with a tab, oldest first. */
  keys: string[];
  /** Largest first; the "Outras" bucket, when there is one, is last. */
  categories: MatrixCategory[];
  monthTotals: number[];
  total: number;
}

/** Category × month table: the `topN` biggest categories over the period, everything else grouped as "Outras". */
export function categoryMatrix(months: AnalysisMonth[], keys: string[], options: CategoryOptions, topN = 6): CategoryMatrix {
  const byKey = indexByKey(months);
  const present = [...keys].filter((key) => byKey.has(key)).sort();
  const perMonth = present.map((key) => totalsFor(byKey, refFromKey(key), options));

  const names = new Set<string>();
  const savings = new Set<string>();
  for (const month of perMonth) {
    for (const [categoria, value] of month.totals) if (value !== 0) names.add(categoria);
    for (const categoria of month.savings) savings.add(categoria);
  }

  const all: MatrixCategory[] = [...names]
    .map((categoria) => {
      const totals = perMonth.map((month) => month.totals.get(categoria) ?? 0);
      return { categoria, totals, total: totals.reduce((acc, value) => acc + value, 0), isSavings: savings.has(categoria), isOther: false };
    })
    .sort((a, b) => b.total - a.total);

  const head = all.slice(0, topN);
  const tail = all.slice(topN);
  const categories = tail.length
    ? [
        ...head,
        {
          categoria: OTHER_CATEGORIES,
          totals: present.map((_, index) => tail.reduce((acc, category) => acc + category.totals[index], 0)),
          total: tail.reduce((acc, category) => acc + category.total, 0),
          isSavings: false,
          isOther: true,
        },
      ]
    : head;

  const monthTotals = present.map((_, index) => all.reduce((acc, category) => acc + category.totals[index], 0));
  return { keys: present, categories, monthTotals, total: monthTotals.reduce((acc, value) => acc + value, 0) };
}

export interface PieSlice {
  categoria: string;
  total: number;
  /** Fraction of the pie, 0..1. */
  share: number;
  /** The "Outras" slice that groups the smallest categories. */
  isOther: boolean;
}

/** Categories (biggest first) as pie slices: the top `maxSlices` plus one "Outras" slice for the rest. Non-positive totals are left out. */
export function pieSlices(rows: { categoria: string; total: number }[], maxSlices = 6): PieSlice[] {
  const positive = rows.filter((row) => row.total > 0);
  const sum = positive.reduce((acc, row) => acc + row.total, 0);
  if (sum === 0) return [];
  const slice = (categoria: string, total: number, isOther: boolean): PieSlice => ({ categoria, total, share: total / sum, isOther });
  const top = positive.slice(0, maxSlices).map((row) => slice(row.categoria, row.total, false));
  const rest = positive.slice(maxSlices);
  if (rest.length === 0) return top;
  return [...top, slice(OTHER_CATEGORIES, rest.reduce((acc, row) => acc + row.total, 0), true)];
}
