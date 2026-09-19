import { addMonths, compareRefs, monthKey, nextRef, type MonthRef } from "./months";
import type { MonthPoint } from "./timeline";
import type { AnalysisMonth } from "./types";

export interface InstallmentPlan {
  /** Name without the "3/8" marker. */
  name: string;
  /** Value of one installment. */
  valor: number;
  current: number;
  total: number;
  /** Installments already paid: the ones up to the previous bill (this month's charge is only paid next month). */
  paidCount: number;
  /** Installments still to be paid, including the one that goes into the next bill. */
  remainingCount: number;
  paidAmount: number;
  remainingAmount: number;
  totalAmount: number;
  /** Bill (payment month) in which this installment shows up for the last time. */
  lastBill: MonthRef;
  /** First bill that no longer includes it. */
  freedIn: MonthRef;
}

export interface FreedAmount {
  ref: MonthRef;
  key: string;
  amount: number;
  /** Names of the plans that end right before `ref`. */
  names: string[];
}

const MARKER = /\(?\b\d{1,3}\s*\/\s*\d{1,3}\b\)?/;

/** "Tênis Ana - Loja 5/6" -> "Tênis Ana - Loja". */
export function baseName(name: string): string {
  const stripped = name.replace(MARKER, "").replace(/\s{2,}/g, " ").replace(/[\s\-–]+$/, "").trim();
  return stripped || name.trim();
}

/**
 * Installment plans running in `month`'s Nubank table. That table is paid the following month, so a
 * plan with `remaining` charges left after this one last appears in the bill of month + remaining + 1.
 */
export function listInstallmentPlans(month: AnalysisMonth): InstallmentPlan[] {
  const plans = month.nubank.flatMap((row): InstallmentPlan[] => {
    if (!row.installment || row.installment.current > row.installment.total) return [];
    const remaining = row.installment.total - row.installment.current;
    return [
      {
        name: baseName(row.name),
        valor: row.valor,
        current: row.installment.current,
        total: row.installment.total,
        paidCount: row.installment.current - 1,
        remainingCount: remaining + 1,
        paidAmount: row.valor * (row.installment.current - 1),
        remainingAmount: row.valor * (remaining + 1),
        totalAmount: row.valor * row.installment.total,
        lastBill: addMonths(month, remaining + 1),
        freedIn: addMonths(month, remaining + 2),
      },
    ];
  });
  return plans.sort((a, b) => compareRefs(a.lastBill, b.lastBill) || a.name.localeCompare(b.name));
}

/** How much the card bill drops, month by month, as plans end. */
export function freedByMonth(plans: InstallmentPlan[]): FreedAmount[] {
  const byKey = new Map<string, FreedAmount>();
  for (const plan of plans) {
    const key = monthKey(plan.freedIn);
    const entry = byKey.get(key) ?? { ref: plan.freedIn, key, amount: 0, names: [] };
    entry.amount += plan.valor;
    entry.names.push(plan.name);
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => compareRefs(a.ref, b.ref));
}

/**
 * How much of each bill (by month key) is installments. A plan sits in the bill of the month it is read
 * from (when it isn't on its first charge) and in every bill through `lastBill`.
 */
export function installmentsByBill(plans: InstallmentPlan[]): Map<string, number> {
  const byKey = new Map<string, number>();
  for (const plan of plans) {
    const bills = plan.remainingCount + (plan.paidCount > 0 ? 1 : 0);
    for (let step = 0; step < bills; step++) {
      const key = monthKey(addMonths(plan.lastBill, -step));
      byKey.set(key, (byKey.get(key) ?? 0) + plan.valor);
    }
  }
  return byKey;
}

export interface PlansTotals {
  count: number;
  paid: number;
  remaining: number;
  total: number;
}

/** Sum over every running plan. */
export function summarizePlans(plans: InstallmentPlan[]): PlansTotals {
  return plans.reduce<PlansTotals>(
    (acc, plan) => ({
      count: acc.count + 1,
      paid: acc.paid + plan.paidAmount,
      remaining: acc.remaining + plan.remainingAmount,
      total: acc.total + plan.totalAmount,
    }),
    { count: 0, paid: 0, remaining: 0, total: 0 },
  );
}

/**
 * Past the last tab the projection stops at the last installment's bill, so the month the bill finally
 * drops has no point. Adds it (as installments-only, like the points before it) so the drop shows up
 * as a regular row instead of a note on the side.
 */
export function withTrailingDrops(bills: MonthPoint[], freed: FreedAmount[]): MonthPoint[] {
  const result = [...bills];
  for (const drop of freed) {
    const last = result.at(-1);
    if (!last || last.source !== "installments" || drop.key !== monthKey(nextRef(last))) continue;
    result.push({
      ...last,
      key: drop.key,
      year: drop.ref.year,
      month: drop.ref.month,
      cartao: Math.max(0, last.cartao - drop.amount),
    });
  }
  return result;
}

/**
 * The bills to list: from the current month on, at least `minBills` of them and enough to reach the
 * month the last installment drops out of. When that month is past the projection, every bill of the
 * projection is listed and the drop is added as a trailing row.
 */
export function upcomingBills(timeline: MonthPoint[], currentKey: string, freed: FreedAmount[], minBills: number): MonthPoint[] {
  const upcoming = timeline.filter((point) => point.key >= currentKey);
  const lastDropKey = freed.at(-1)?.key;
  const lastDropIndex = lastDropKey ? upcoming.findIndex((point) => point.key === lastDropKey) : -1;
  const count = !lastDropKey ? minBills : lastDropIndex >= 0 ? Math.max(minBills, lastDropIndex + 1) : upcoming.length;
  return withTrailingDrops(upcoming.slice(0, count), freed);
}
