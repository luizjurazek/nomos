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
  /** Money put aside: débitos in the savings categories (Investimentos, Res. Emergência). Null past the last tab. */
  aportes: number | null;
  /** Money taken out of the reserve (Entradas in "Res. Emergência"). Null past the last tab. */
  retiradas: number | null;
  /** Net saved in the month: aportes − retiradas. */
  poupado: number | null;
  /** Future month (planned values) or a month past the last tab (installments only). */
  projected: boolean;
  source: "sheet" | "installments";
}

/**
 * How a month reads with or without the savings money. The sheet books what is saved as a débito and what
 * comes back from the reserve as an entrada, so with savings both totals carry it. Without it (the day to
 * day view) entradas are income only and débitos spending only; the net `poupado` stands on its own and
 * entradas − débitos − cartão − poupado is the same saldo either way.
 */
export function viewPoint(point: MonthPoint, withSavings: boolean): MonthPoint {
  if (withSavings || point.entradas === null || point.debitos === null) return point;
  return { ...point, entradas: point.entradas - (point.retiradas ?? 0), debitos: point.debitos - (point.aportes ?? 0) };
}

export function viewPoints(points: MonthPoint[], withSavings: boolean): MonthPoint[] {
  return withSavings ? points : points.map((point) => viewPoint(point, false));
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
    const aportes = sumValues(month.debitos.filter((row) => row.isTransfer));
    const retiradas = sumValues(month.entradas.filter((row) => row.isTransfer));
    return {
      key: monthKey(month),
      year: month.year,
      month: month.month,
      entradas,
      debitos,
      cartao,
      saldo: entradas - debitos - cartao,
      aportes,
      retiradas,
      poupado: aportes - retiradas,
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
      aportes: null,
      retiradas: null,
      poupado: null,
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
  /** Net saved over the period (aportes − retiradas). */
  poupadoTotal: number;
  aportesTotal: number;
  retiradasTotal: number;
  /** Real income over the period: entradas minus reserve withdrawals (those are your own money coming back). */
  realIncome: number;
  /** Net saved as a fraction of real income; null when there is none. */
  poupadoRate: number | null;
  avgEntradas: number;
  /** Débitos plus the card bill. */
  avgSaidas: number;
  /** The two parts of `avgSaidas`. */
  avgDebitos: number;
  avgCartao: number;
}

/** Totals over the months that have full data (sheet months); card-only projections are left out. */
export function summarizePeriod(points: MonthPoint[], withSavings = true): PeriodSummary {
  const full = points.filter((point) => point.saldo !== null);
  const count = full.length;
  const totalEntradas = full.reduce((acc, point) => acc + (point.entradas ?? 0), 0);
  const totalSaidas = full.reduce((acc, point) => acc + (point.debitos ?? 0) + point.cartao, 0);
  const aportesTotal = full.reduce((acc, point) => acc + (point.aportes ?? 0), 0);
  const retiradasTotal = full.reduce((acc, point) => acc + (point.retiradas ?? 0), 0);
  const realIncome = totalEntradas - retiradasTotal;
  // Averages follow the view: the day to day leaves the savings money out of both.
  const avgEntradas = withSavings ? totalEntradas : realIncome;
  const avgSaidas = withSavings ? totalSaidas : totalSaidas - aportesTotal;
  const totalCartao = full.reduce((acc, point) => acc + point.cartao, 0);
  return {
    months: count,
    saldoTotal: full.reduce((acc, point) => acc + (point.saldo ?? 0), 0),
    poupadoTotal: aportesTotal - retiradasTotal,
    aportesTotal,
    retiradasTotal,
    realIncome,
    poupadoRate: realIncome > 0 ? (aportesTotal - retiradasTotal) / realIncome : null,
    avgEntradas: count ? avgEntradas / count : 0,
    avgSaidas: count ? avgSaidas / count : 0,
    avgDebitos: count ? (avgSaidas - totalCartao) / count : 0,
    avgCartao: count ? totalCartao / count : 0,
  };
}
