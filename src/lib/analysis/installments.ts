import { addMonths, compareRefs, monthKey, type MonthRef } from "./months";
import type { AnalysisMonth } from "./types";

export interface InstallmentPlan {
  /** Name without the "3/8" marker. */
  name: string;
  valor: number;
  current: number;
  total: number;
  /** Bill (payment month) in which this installment shows up for the last time. */
  lastBill: MonthRef;
  /** First bill that no longer includes it. */
  freedIn: MonthRef;
}

export interface FreedAmount {
  ref: MonthRef;
  key: string;
  amount: number;
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
    const entry = byKey.get(key) ?? { ref: plan.freedIn, key, amount: 0 };
    entry.amount += plan.valor;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => compareRefs(a.ref, b.ref));
}
