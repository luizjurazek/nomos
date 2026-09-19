"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import {
  categoryBreakdown,
  categoryBreakdownForPeriod,
  categoryMatrix,
  categorySeries,
  type CategoryKind,
  type CategoryOptions,
} from "@/lib/analysis/categories";
import { formatBRLWhole, formatPercent } from "@/lib/analysis/format";
import { monthKey, previousRef, refFromKey } from "@/lib/analysis/months";
import type { AnalysisMonth } from "@/lib/analysis/types";
import { TABLE_CONFIGS } from "@/lib/sheets/tableConfigs";
import { CategoryHeatmap } from "./category-heatmap";
import { CategoryPie } from "./category-pie";
import { CategoryStacked } from "./category-stacked";
import { refLabel } from "./labels";
import { MiniBars } from "./mini-bars";
import type { Scope } from "./scope-switch";

interface CategoryBreakdownProps {
  months: AnalysisMonth[];
  selectedKey: string;
  onSelectMonth: (key: string) => void;
  scope: Scope;
  /** Months of the visible period that have a tab. */
  periodKeys: string[];
  periodLabel: string;
  /** Months after the current one (planned values). */
  projectedKeys: Set<string>;
}

type View = "ranking" | "pie" | "stacked" | "heatmap";

const VIEWS: { id: View; label: string; onlyPeriod?: boolean }[] = [
  { id: "ranking", label: "Ranking" },
  { id: "pie", label: "Pizza" },
  { id: "stacked", label: "Por mês", onlyPeriod: true },
  { id: "heatmap", label: "Mapa de calor", onlyPeriod: true },
];

/** What a ranking row shows, whichever scope produced it. */
interface RankRow {
  categoria: string;
  total: number;
  share: number;
  isSavings: boolean;
  /** Change vs the previous month (month scope only). */
  delta: number | null;
  /** Average per month (period scope only). */
  average: number | null;
}

const KINDS: { kind: CategoryKind; label: string }[] = [
  { kind: "saidas", label: "Saídas" },
  { kind: "entradas", label: "Entradas" },
];

/**
 * Where the money goes (or comes from). Scope "month": the selected month, with the change vs the month
 * before. Scope "period": every month of the period together, plus two views over time (stacked, heat map).
 */
export function CategoryBreakdown({ months, selectedKey, onSelectMonth, scope, periodKeys, periodLabel, projectedKeys }: CategoryBreakdownProps) {
  const [kind, setKind] = useState<CategoryKind>("saidas");
  const [includeTransfers, setIncludeTransfers] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [view, setView] = useState<View>("ranking");

  const options: CategoryOptions = useMemo(() => ({ kind, includeTransfers }), [kind, includeTransfers]);
  // The views over time only make sense for a whole period; in month scope only ranking and pie apply.
  const activeView: View = scope === "period" || view === "pie" ? view : "ranking";

  const monthBreakdown = useMemo(() => categoryBreakdown(months, selectedKey, options), [months, selectedKey, options]);
  const periodBreakdown = useMemo(() => categoryBreakdownForPeriod(months, periodKeys, options), [months, periodKeys, options]);
  const matrix = useMemo(
    () => (activeView === "ranking" ? null : categoryMatrix(months, periodKeys, options, activeView === "heatmap" ? 12 : 6)),
    [months, periodKeys, options, activeView],
  );

  const ref = refFromKey(selectedKey);
  const paidFrom = previousRef(ref);
  const color = kind === "saidas" ? TABLE_HEADER_COLORS.debitos : TABLE_HEADER_COLORS.entradas;

  const rows: RankRow[] =
    scope === "month"
      ? monthBreakdown.rows.map((row) => ({ ...row, average: null }))
      : periodBreakdown.rows.map((row) => ({ categoria: row.categoria, total: row.total, share: row.share, isSavings: row.isSavings, delta: null, average: row.average }));
  const hasData = scope === "month" ? months.some((month) => monthKey(month) === selectedKey) : periodBreakdown.monthsCount > 0;
  const top = rows[0]?.total ?? 1;
  const monthsCount = periodBreakdown.monthsCount;
  const transferCategories = TABLE_CONFIGS[kind === "saidas" ? "debitos" : "entradas"].semanticTags.map((tag) => tag.category);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-0.5 px-1">
        <h2 className="text-base font-semibold">Categorias</h2>
        <p className="text-xs text-foreground-secondary">
          {scope === "month" ? refLabel(ref) : `${periodLabel} · ${monthsCount} ${monthsCount === 1 ? "mês" : "meses"}`}
          {kind === "saidas" &&
            (scope === "month"
              ? paidFrom && ` · inclui as compras do cartão de ${paidFrom.month.toLowerCase()}, pagas neste mês`
              : " · cada mês inclui as compras do cartão do mês anterior, pagas nele")}
        </p>
      </header>

      <div role="group" aria-label="Forma de ver" className="flex gap-1 self-start rounded-full bg-muted p-0.5">
        {VIEWS.map((option) => {
          const disabled = Boolean(option.onlyPeriod) && scope === "month";
          const active = option.id === activeView;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={disabled ? "Disponível só no escopo Período" : undefined}
              onClick={() => setView(option.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                active ? "bg-background font-medium shadow-sm" : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

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
      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground-secondary">
        <p>
          {kind === "saidas"
            ? "Transferência é dinheiro que você guardou, não gastou (ex.: aporte em investimento ou na reserva de emergência)."
            : "Transferência é dinheiro seu que voltou pra você, não renda nova (ex.: retirada da reserva de emergência)."}{" "}
          {includeTransfers ? "Agora elas estão somadas nos totais abaixo." : "Por padrão elas ficam fora dos totais abaixo."}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>Categorias tratadas como transferência:</span>
          {transferCategories.map((categoria) => (
            <Badge key={categoria} variant="outline" className="font-normal">
              {categoria}
            </Badge>
          ))}
        </div>
      </div>

      {!hasData || rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          {hasData
            ? scope === "month"
              ? "Nada lançado neste mês."
              : "Nada lançado neste período."
            : scope === "month"
              ? "Este mês ainda não tem aba na planilha, então não há categorias para mostrar."
              : "Nenhum mês deste período tem aba na planilha, então não há categorias para mostrar."}
        </p>
      ) : activeView === "stacked" && matrix ? (
        <CategoryStacked matrix={matrix} selectedKey={selectedKey} projectedKeys={projectedKeys} onSelectMonth={onSelectMonth} />
      ) : activeView === "heatmap" && matrix ? (
        <CategoryHeatmap matrix={matrix} kind={kind} selectedKey={selectedKey} projectedKeys={projectedKeys} onSelectMonth={onSelectMonth} />
      ) : activeView === "pie" ? (
        <CategoryPie rows={rows} totalLabel={KINDS.find((option) => option.kind === kind)?.label ?? ""} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((row) => {
            const open = openCategory === row.categoria;
            // Spending more is bad and earning less is bad, but saving more is good (and saving less is not).
            const delta = row.delta ?? 0;
            const worse = row.isSavings ? delta < 0 : kind === "saidas" ? delta > 0 : delta < 0;
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
                    {row.average !== null ? (
                      <span>média {formatBRLWhole(row.average)}/mês</span>
                    ) : row.delta === null ? (
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
