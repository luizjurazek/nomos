import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { formatBRLWhole } from "@/lib/analysis/format";
import type { FreedAmount, InstallmentPlan } from "@/lib/analysis/installments";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { refLabel, shortRefLabel } from "./labels";

interface InstallmentsPanelProps {
  /** The next card bills, starting with the current month. */
  bills: MonthPoint[];
  plans: InstallmentPlan[];
  freed: FreedAmount[];
}

/** The card ahead: what the next bills look like, which installments are running and when the bill gets lighter. */
export function InstallmentsPanel({ bills, plans, freed }: InstallmentsPanelProps) {
  const max = Math.max(1, ...bills.map((bill) => bill.cartao));

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5 px-1">
        <h2 className="text-base font-semibold">Cartão nos próximos meses</h2>
        <p className="text-xs text-foreground-secondary">
          Fatura de cada mês = compras do mês anterior. Depois da última aba, só contam as parcelas já contratadas.
        </p>
      </header>

      {bills.length > 0 && (
        <ul className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card px-4 py-3">
          {bills.map((bill) => (
            <li key={bill.key} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-foreground-secondary">{shortRefLabel(bill)}</span>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (bill.cartao / max) * 100)}%`,
                    backgroundColor: TABLE_HEADER_COLORS.nubank,
                    opacity: bill.source === "installments" ? 0.55 : 1,
                  }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">{formatBRLWhole(bill.cartao)}</span>
            </li>
          ))}
        </ul>
      )}

      {freed.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card px-4 py-3">
          <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Quando a fatura cai</h3>
          <ul className="flex flex-col gap-1.5">
            {freed.slice(0, 6).map((item) => (
              <li key={item.key} className="flex items-baseline justify-between gap-3 text-sm">
                <span>A partir de {refLabel(item.ref).toLowerCase()}</span>
                <span className="font-medium tabular-nums">−{formatBRLWhole(item.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plans.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="px-1 text-xs font-medium tracking-wide text-foreground-secondary uppercase">Parcelas em andamento</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {plans.map((plan) => (
              <li key={`${plan.name}-${plan.current}-${plan.valor}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{plan.name}</p>
                  <p className="text-xs text-foreground-secondary">
                    {plan.current}/{plan.total} · última fatura em {shortRefLabel(plan.lastBill)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatBRLWhole(plan.valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
