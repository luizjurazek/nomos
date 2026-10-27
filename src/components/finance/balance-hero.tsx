import { formatCurrency } from "@/lib/format/currency";
import type { MonthKpis } from "@/lib/sheets/types";

/** Top card of the month screen: current balance (big) and where the month ends once everything settles. Color is only a dot, like the VA card. */
export function BalanceHero({ kpis }: { kpis: MonthKpis }) {
  return (
    <section className="glass-surface rounded-3xl border border-border px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full bg-primary" />
        <p className="text-sm text-foreground-secondary">Saldo atual</p>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(kpis.saldoAtual)}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          {/* Paler dot, same as the summary: the final balance is the "still pending" sibling of the current one. */}
          <span className="size-2.5 shrink-0 rounded-full bg-primary opacity-45" />
          <p className="text-sm text-foreground-secondary">Saldo final</p>
        </div>
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(kpis.saldoFinal)}</p>
      </div>
    </section>
  );
}
