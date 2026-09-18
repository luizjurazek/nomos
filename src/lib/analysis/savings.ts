import { MONTH_NAMES } from "../sheets/monthNames";
import type { MonthData } from "../sheets/types";
import { monthKey, sumValues, type MonthRef, type Now } from "./months";
import type { AnalysisMonth } from "./types";

export interface SavingsSummary {
  /** Net saved in the viewed month: aportes − retiradas da reserva. */
  month: number;
  /** Net saved from the first month on record through `through`, withdrawals included; null when the history couldn't be read. */
  total: number | null;
  /** Last month counted in `total`: the viewed month, but never later than the current calendar month. */
  through: MonthRef;
}

/** Net saved in a month of the analysis data: débitos in the savings categories minus reserve withdrawals. */
export function monthNet(month: AnalysisMonth): number {
  return sumValues(month.debitos.filter((row) => row.isTransfer)) - sumValues(month.entradas.filter((row) => row.isTransfer));
}

/** Same number, straight from a month page's own (always fresh) data. */
export function monthDataNet(data: Pick<MonthData, "debitos" | "entradas">): number {
  return sumValues(data.debitos.filter((row) => row.isPoupanca)) - sumValues(data.entradas.filter((row) => row.isReservaWithdrawal));
}

/**
 * Savings for the month being viewed plus the running total up to it. The total never goes past the
 * current calendar month (planned savings of future months don't count as saved yet). The viewed
 * month itself comes from `viewedNet`, so edits show up at once; earlier months come from `history`,
 * which may be a few seconds stale.
 */
export function summarizeSavings(history: AnalysisMonth[] | null, viewed: MonthRef, now: Now, viewedNet: number): SavingsSummary {
  const currentRef: MonthRef = { year: String(now.year), month: MONTH_NAMES[now.monthIndex] };
  const through = monthKey(viewed) <= monthKey(currentRef) ? viewed : currentRef;
  if (!history) return { month: viewedNet, total: null, through };

  const throughKey = monthKey(through);
  const before = history.filter((month) => monthKey(month) < throughKey).reduce((acc, month) => acc + monthNet(month), 0);
  const throughMonth = history.find((month) => monthKey(month) === throughKey);
  const atThrough = throughKey === monthKey(viewed) ? viewedNet : throughMonth ? monthNet(throughMonth) : 0;

  return { month: viewedNet, total: before + atThrough, through };
}
