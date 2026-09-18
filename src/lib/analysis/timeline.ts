import { isAfterNow, indexByKey, monthKey, nextRef, previousRef, sortMonths, sumValues, type MonthRef, type Now } from "./months";
import type { AnalysisMonth } from "./types";

export interface MonthPoint {
  key: string;
  year: string;
  month: string;
  /** Null for months past the last tab: only the card bill is known there. */
  entradas: number | null;
  /** Without the auto-synced card line, which is shown separately as `cartao`. */
  debitos: number | null;
  /** Card bill paid this month = previous month's Nubank total. */
  cartao: number;
  /** Entradas − Débitos − Cartão; null when entradas/débitos are unknown. */
  saldo: number | null;
  /** Future month (planned values) or a month past the last tab (installments only). */
  projected: boolean;
  source: "sheet" | "installments";
}

/** Longest stretch of months, past the last tab, that we project card bills for. */
const PROJECTION_HORIZON = 12;

/**
 * The card is analysed by payment date: the bill paid in month M is the sum of M−1's Nubank table
 * (the same rule `cardRollover` uses). When M−1 has no tab we fall back to the synced rollover row.
 */
function cardBillFor(byKey: Map<string, AnalysisMonth>, month: AnalysisMonth): number {
  const previous = previousRef(month);
  const previousMonth = previous ? byKey.get(monthKey(previous)) : undefined;
  if (previousMonth) return sumValues(previousMonth.nubank);
  return sumValues(month.debitos.filter((row) => row.isCardRollover));
}

/**
 * One point per month tab (real, previsto values), followed by card-bill-only points for the months
 * after the last tab: the last tab's Nubank total is next month's bill, and every installment that
 * still has charges left keeps repeating its value until it ends.
 */
export function buildTimeline(months: AnalysisMonth[], now: Now): MonthPoint[] {
  const sorted = sortMonths(months);
  if (sorted.length === 0) return [];
  const byKey = indexByKey(sorted);

  const points: MonthPoint[] = sorted.map((month) => {
    const entradas = sumValues(month.entradas);
    const debitos = sumValues(month.debitos.filter((row) => !row.isCardRollover));
    const cartao = cardBillFor(byKey, month);
    return {
      key: monthKey(month),
      year: month.year,
      month: month.month,
      entradas,
      debitos,
      cartao,
      saldo: entradas - debitos - cartao,
      projected: isAfterNow(month, now),
      source: "sheet",
    };
  });

  const last = sorted[sorted.length - 1];
  const withCharges = last.nubank.filter((row) => row.installment && row.installment.current < row.installment.total);
  const longestPlan = Math.max(0, ...withCharges.map((row) => row.installment!.total - row.installment!.current));

  const pushBill = (ref: MonthRef, cartao: number) =>
    points.push({
      key: monthKey(ref),
      year: ref.year,
      month: ref.month,
      entradas: null,
      debitos: null,
      cartao,
      saldo: null,
      projected: true,
      source: "installments",
    });

  let ref = nextRef(last);
  pushBill(ref, sumValues(last.nubank));
  for (let k = 1; k <= Math.min(longestPlan, PROJECTION_HORIZON - 1); k++) {
    ref = nextRef(ref);
    const stillCharging = withCharges.filter((row) => row.installment!.total - row.installment!.current >= k);
    pushBill(ref, sumValues(stillCharging));
  }

  return points;
}

/** The month whose Nubank table describes what is in progress now: the current tab, else the latest one before it, else the first. */
export function pickReferenceMonth(months: AnalysisMonth[], now: Now): AnalysisMonth | null {
  const sorted = sortMonths(months);
  const notAfterNow = sorted.filter((month) => !isAfterNow(month, now));
  return notAfterNow[notAfterNow.length - 1] ?? sorted[0] ?? null;
}

export interface PeriodSummary {
  months: number;
  saldoTotal: number;
  avgEntradas: number;
  avgSaidas: number;
  tightest: MonthPoint | null;
}

/** Totals over the months that have full data (sheet months); card-only projections are left out. */
export function summarizePeriod(points: MonthPoint[]): PeriodSummary {
  const full = points.filter((point) => point.saldo !== null);
  const count = full.length;
  const totalEntradas = full.reduce((acc, point) => acc + (point.entradas ?? 0), 0);
  const totalSaidas = full.reduce((acc, point) => acc + (point.debitos ?? 0) + point.cartao, 0);
  const tightest = full.reduce<MonthPoint | null>(
    (worst, point) => (worst === null || (point.saldo ?? 0) < (worst.saldo ?? 0) ? point : worst),
    null,
  );
  return {
    months: count,
    saldoTotal: full.reduce((acc, point) => acc + (point.saldo ?? 0), 0),
    avgEntradas: count ? totalEntradas / count : 0,
    avgSaidas: count ? totalSaidas / count : 0,
    tightest,
  };
}
