"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SAVINGS_COLOR } from "@/components/analysis/colors";
import { shortRefLabel } from "@/components/analysis/labels";
import { formatCurrency } from "@/lib/format/currency";
import type { SavingsSummary } from "@/lib/analysis/savings";
import type { MonthKpis } from "@/lib/sheets/types";
import { TABLE_HEADER_COLORS } from "./table-colors";

interface SummaryRow {
  label: string;
  value: number;
  color: string;
  /** Paler dot for the "still pending" sibling of a color family (A receber, Pago...). */
  faded?: boolean;
  emphasis?: boolean;
}

interface SummarySection {
  title: string;
  note?: string;
  rows: SummaryRow[];
}

/** Collapsible month summary (closed by default): every KPI grouped by section, each row with a colored dot. */
export function MonthSummaryDropdown({ kpis, savings }: { kpis: MonthKpis; savings: SavingsSummary }) {
  const [open, setOpen] = useState(false);

  const vaColor = TABLE_HEADER_COLORS.valeAlimentacaoConsumo;
  const sections: SummarySection[] = [
    {
      title: "Entradas",
      rows: [
        { label: "Recebido", value: kpis.recebido, color: TABLE_HEADER_COLORS.entradas },
        { label: "A receber", value: kpis.aReceber, color: TABLE_HEADER_COLORS.entradas, faded: true },
      ],
    },
    {
      title: "Débitos",
      rows: [
        { label: "Pago", value: kpis.pago, color: TABLE_HEADER_COLORS.debitos, faded: true },
        { label: "A pagar", value: kpis.aPagar, color: TABLE_HEADER_COLORS.debitos },
      ],
    },
    {
      title: "Saldo",
      rows: [
        { label: "Saldo atual", value: kpis.saldoAtual, color: "var(--primary)" },
        { label: "Saldo final", value: kpis.saldoFinal, color: "var(--primary)", faded: true, emphasis: true },
      ],
    },
    {
      title: "Poupado",
      note: savings.isProjection ? "Projeção: valores planejados" : "Já descontadas as retiradas da reserva",
      rows: [
        { label: "No mês", value: savings.month, color: SAVINGS_COLOR },
        // Null when the history of earlier months couldn't be read: better no total than a wrong one.
        ...(savings.total === null
          ? []
          : [{ label: `${savings.isProjection ? "Total projetado até" : "Total até"} ${shortRefLabel(savings.through)}`, value: savings.total, color: SAVINGS_COLOR, emphasis: true }]),
      ],
    },
    {
      title: "Vale alimentação",
      // The voucher lives on its own: none of these values are part of the balances above.
      note: "Não entra no saldo do mês",
      rows: [
        { label: "Recebido", value: kpis.valeAlimentacaoRecebido, color: vaColor },
        {
          label: "Gasto",
          value: kpis.valeAlimentacaoRecebido - kpis.valeAlimentacaoSaldo,
          color: vaColor,
          faded: true,
        },
        { label: "Saldo", value: kpis.valeAlimentacaoSaldo, color: vaColor, emphasis: true },
      ],
    },
  ];

  return (
    // From lg the section may shrink inside the capped sidebar; its content then scrolls on its own.
    <section className="glass-surface flex min-h-0 shrink flex-col overflow-hidden rounded-2xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full shrink-0 items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">Resumo do mês</span>
        <ChevronDown
          className={`size-4 text-foreground-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="min-h-0 divide-y divide-border overflow-y-auto border-t border-border [scrollbar-width:thin]">
          {sections.map((section) => (
            <div key={section.title} className="px-4 py-3">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">
                  {section.title}
                </h3>
                {section.note && <span className="text-[11px] text-foreground-secondary">{section.note}</span>}
              </div>
              <dl className="flex flex-col gap-2.5">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-sm text-foreground-secondary">
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${row.faded ? "opacity-45" : ""}`}
                        style={{ backgroundColor: row.color }}
                      />
                      {row.label}
                    </dt>
                    <dd className={`text-sm tabular-nums ${row.emphasis ? "font-semibold" : "font-medium"}`}>
                      {formatCurrency(row.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
