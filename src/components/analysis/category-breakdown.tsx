"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { categoryBreakdown, categorySeries, type CategoryKind, type CategoryOptions } from "@/lib/analysis/categories";
import { formatBRLWhole, formatPercent } from "@/lib/analysis/format";
import { monthKey, previousRef, refFromKey } from "@/lib/analysis/months";
import type { AnalysisMonth } from "@/lib/analysis/types";
import { refLabel } from "./labels";
import { MiniBars } from "./mini-bars";

interface CategoryBreakdownProps {
  months: AnalysisMonth[];
  selectedKey: string;
  onSelectMonth: (key: string) => void;
}

const KINDS: { kind: CategoryKind; label: string }[] = [
  { kind: "saidas", label: "Saídas" },
  { kind: "entradas", label: "Entradas" },
];

/** Where the selected month's money goes (or comes from), ranked, with the change vs the month before. */
export function CategoryBreakdown({ months, selectedKey, onSelectMonth }: CategoryBreakdownProps) {
  const [kind, setKind] = useState<CategoryKind>("saidas");
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const options: CategoryOptions = useMemo(() => ({ kind, includeTransfers }), [kind, includeTransfers]);
  const breakdown = useMemo(() => categoryBreakdown(months, selectedKey, options), [months, selectedKey, options]);
  const ref = refFromKey(selectedKey);
  const paidFrom = previousRef(ref);
  const color = kind === "saidas" ? TABLE_HEADER_COLORS.debitos : TABLE_HEADER_COLORS.entradas;
  const hasMonth = months.some((month) => monthKey(month) === selectedKey);
  const top = breakdown.rows[0]?.total ?? 1;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5 px-1">
        <h2 className="text-base font-semibold">Categorias</h2>
        <p className="text-xs text-foreground-secondary">
          {refLabel(ref)}
          {kind === "saidas" && paidFrom && ` · inclui as compras do cartão de ${paidFrom.month.toLowerCase()}, pagas neste mês`}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Tipo" className="flex gap-2">
          {KINDS.map((option) => {
            const active = option.kind === kind;
            return (
              <button
                key={option.kind}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setKind(option.kind);
                  setOpenCategory(null);
                }}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:bg-accent/60"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Checkbox checked={includeTransfers} onCheckedChange={(checked) => setIncludeTransfers(checked === true)} />
          Incluir transferências
        </label>
      </div>

      {!hasMonth || breakdown.rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          {hasMonth ? "Nada lançado neste mês." : "Este mês ainda não tem aba na planilha, então não há categorias para mostrar."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {breakdown.rows.map((row) => {
            const open = openCategory === row.categoria;
            const worse = kind === "saidas" ? (row.delta ?? 0) > 0 : (row.delta ?? 0) < 0;
            return (
              <li key={row.categoria}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenCategory(open ? null : row.categoria)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{row.categoria}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatBRLWhole(row.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, (row.total / top) * 100)}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-foreground-secondary">
                    <span>{formatPercent(row.share)} do total</span>
                    {row.delta === null ? (
                      <span>sem comparação</span>
                    ) : row.delta === 0 ? (
                      <span>igual ao mês anterior</span>
                    ) : (
                      <span className={`flex items-center gap-1 ${worse ? "text-destructive" : "text-success"}`}>
                        {row.delta > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                        {formatPercent(Math.abs(row.delta))} vs mês anterior
                      </span>
                    )}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    <MiniBars points={categorySeries(months, row.categoria, options)} color={color} selectedKey={selectedKey} onSelect={onSelectMonth} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
