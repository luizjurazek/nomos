import { formatCurrency } from "@/lib/format/currency";
import type { MonthKpis } from "@/lib/sheets/types";
import { TABLE_HEADER_COLORS } from "./table-colors";

/** Top card of the month screen: current balance (big), what is still left to receive and to pay. Color is only a dot, like the VA card. */
export function BalanceHero({ kpis }: { kpis: MonthKpis }) {
  return (
    <section className="glass-surface rounded-3xl border border-border px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full bg-primary" />
        <p className="text-sm text-foreground-secondary">Saldo atual</p>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(kpis.saldoAtual)}</p>
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
        {[
          { label: "A receber", value: kpis.aReceber, color: TABLE_HEADER_COLORS.entradas },
          { label: "A pagar", value: kpis.aPagar, color: TABLE_HEADER_COLORS.debitos },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <p className="text-sm text-foreground-secondary">{item.label}</p>
            </div>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
