import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { formatBRLWhole } from "@/lib/analysis/format";
import { formatCurrency } from "@/lib/format/currency";
import type { FreedAmount, InstallmentPlan, PlansTotals } from "@/lib/analysis/installments";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { refLabel, shortRefLabel } from "./labels";

interface InstallmentsPanelProps {
  /** The next card bills, starting with the current month. */
  bills: MonthPoint[];
  plans: InstallmentPlan[];
  freed: FreedAmount[];
  /** Part of each bill (by month key) that is installments. */
  installmentBills: Map<string, number>;
  totals: PlansTotals;
}

/** The card ahead: what the next bills look like, which installments are running and when the bill gets lighter. */
export function InstallmentsPanel({ bills, plans, freed, installmentBills, totals }: InstallmentsPanelProps) {
  const max = Math.max(1, ...bills.map((bill) => bill.cartao));
  const freedByKey = new Map(freed.map((item) => [item.key, item]));
  const billKeys = new Set(bills.map((bill) => bill.key));
  const beyond = freed.filter((item) => !billKeys.has(item.key));

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
          {bills.map((bill) => {
            const drop = freedByKey.get(bill.key);
            const inInstallments = installmentBills.get(bill.key) ?? 0;
            return (
              <li key={bill.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
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
                </div>
                {inInstallments > 0 && (
                  <p className="pl-[4.25rem] text-xs text-foreground-secondary">
                    <span className="font-medium tabular-nums text-foreground">{formatCurrency(inInstallments)}</span> em parcelas
                  </p>
                )}
                {drop && <DropNote drop={drop} />}
              </li>
            );
          })}
        </ul>
      )}

      {/* Drops that land after the last bill above (the projection ends where the last installment does). */}
      {beyond.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card px-4 py-3">
          {beyond.map((drop) => (
            <li key={drop.key}>
              <DropNote drop={drop} showMonth />
            </li>
          ))}
        </ul>
      )}

      {plans.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5 px-1">
            <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Parcelas em andamento</h3>
            <p className="text-xs text-foreground-secondary">
              Pago = faturas já quitadas. A parcela lançada neste mês só cai na fatura do mês seguinte, então ainda conta como falta.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium">
              Todas as parcelas <span className="font-normal text-foreground-secondary">· {totals.count} em andamento</span>
            </p>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <PlanFigure label="Pago" value={totals.paid} />
              <PlanFigure label="Falta" value={totals.remaining} />
              <PlanFigure label="Total" value={totals.total} />
            </dl>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {plans.map((plan) => (
              <li key={`${plan.name}-${plan.current}-${plan.valor}`} className="flex flex-col gap-2.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{plan.name}</p>
                    <p className="text-xs text-foreground-secondary">
                      {plan.current}/{plan.total} · último pagamento em {shortRefLabel(plan.lastBill)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(plan.valor)}</p>
                    <p className="text-xs text-foreground-secondary">por parcela</p>
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${plan.paidCount} de ${plan.total} parcelas pagas`}
                  aria-valuemin={0}
                  aria-valuemax={plan.total}
                  aria-valuenow={plan.paidCount}
                  className="h-1.5 rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(plan.paidCount / plan.total) * 100}%`, backgroundColor: TABLE_HEADER_COLORS.nubank }}
                  />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <PlanFigure label={`Pago (${plan.paidCount}x)`} value={plan.paidAmount} />
                  <PlanFigure label={`Falta (${plan.remainingCount}x)`} value={plan.remainingAmount} />
                  <PlanFigure label={`Total (${plan.total}x)`} value={plan.totalAmount} />
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** "A fatura cai R$ 120,00 a partir daqui": which plans end right before this bill and how much lighter it gets. */
function DropNote({ drop, showMonth = false }: { drop: FreedAmount; showMonth?: boolean }) {
  return (
    <p className={`text-xs text-success ${showMonth ? "" : "pl-[4.25rem]"}`}>
      <span className="font-medium tabular-nums">
        {showMonth ? `A partir de ${refLabel(drop.ref).toLowerCase()}: ` : ""}−{formatCurrency(drop.amount)}
      </span>{" "}
      na fatura{showMonth ? "" : " a partir daqui"} · terminam {drop.names.join(", ")}
    </p>
  );
}

function PlanFigure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-foreground-secondary">{label}</dt>
      <dd className="font-medium tabular-nums">{formatCurrency(value)}</dd>
    </div>
  );
}
