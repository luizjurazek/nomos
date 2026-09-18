"use client";

import { useMemo, useState } from "react";
import { freedByMonth, listInstallmentPlans } from "@/lib/analysis/installments";
import { MonthRef, monthKey, refFromKey, type Now } from "@/lib/analysis/months";
import { buildTimeline, pickReferenceMonth, summarizePeriod } from "@/lib/analysis/timeline";
import type { AnalysisMonth } from "@/lib/analysis/types";
import { MONTH_NAMES } from "@/lib/sheets/monthNames";
import { CategoryBreakdown } from "./category-breakdown";
import { InstallmentsPanel } from "./installments-panel";
import { refLabel } from "./labels";
import { MonthTable } from "./month-table";
import { MonthlyChart } from "./monthly-chart";
import { RefreshButton } from "./refresh-button";
import { ScopeSwitch, type Scope } from "./scope-switch";
import { SectionHeader } from "./section-header";
import { SummaryCards } from "./summary-cards";

type Range = "year" | "next12" | "all";

const RANGES: { id: Range; label: string }[] = [
  { id: "year", label: "Este ano" },
  { id: "next12", label: "Próximos 12 meses" },
  { id: "all", label: "Tudo" },
];

const NEXT_BILLS = 6;

interface AnalysisViewProps {
  months: AnalysisMonth[];
  now: Now;
}

export function AnalysisView({ months, now }: AnalysisViewProps) {
  const [range, setRange] = useState<Range>("year");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("period");

  const timeline = useMemo(() => buildTimeline(months, now), [months, now]);
  const currentKey = monthKey({ year: String(now.year), month: MONTH_NAMES[now.monthIndex] } satisfies MonthRef);

  const visible = useMemo(() => {
    if (range === "all") return timeline;
    if (range === "year") return timeline.filter((point) => point.year === String(now.year));
    return timeline.filter((point) => point.key >= currentKey).slice(0, 12);
  }, [timeline, range, now.year, currentKey]);

  // The picked month wins while it is on screen; otherwise land on the current month, else the closest tab before it.
  const selectedKey = useMemo(() => {
    if (pickedKey && visible.some((point) => point.key === pickedKey)) return pickedKey;
    if (visible.some((point) => point.key === currentKey)) return currentKey;
    const sheet = visible.filter((point) => point.source === "sheet");
    return (sheet.filter((point) => point.key <= currentKey).at(-1) ?? sheet[0] ?? visible[0])?.key ?? null;
  }, [pickedKey, visible, currentKey]);

  const summary = useMemo(() => summarizePeriod(visible), [visible]);
  const selectedPoint = useMemo(() => visible.find((point) => point.key === selectedKey) ?? null, [visible, selectedKey]);
  // Months of the period with a tab: the only ones that have categories.
  const periodKeys = useMemo(() => visible.filter((point) => point.source === "sheet").map((point) => point.key), [visible]);
  const projectedKeys = useMemo(() => new Set(visible.filter((point) => point.projected).map((point) => point.key)), [visible]);
  const periodLabel = RANGES.find((option) => option.id === range)?.label ?? "";
  const monthLabel = selectedKey ? refLabel(refFromKey(selectedKey)) : null;

  const reference = useMemo(() => pickReferenceMonth(months, now), [months, now]);
  const plans = useMemo(() => (reference ? listInstallmentPlans(reference) : []), [reference]);
  const freed = useMemo(() => freedByMonth(plans), [plans]);
  const bills = useMemo(() => timeline.filter((point) => point.key >= currentKey).slice(0, NEXT_BILLS), [timeline, currentKey]);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Análise</h1>
          <p className="text-sm text-foreground-secondary">Projeção mês a mês e categorias</p>
        </div>
        <RefreshButton />
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          Não encontrei nenhum mês nas planilhas configuradas.
        </p>
      ) : (
        <>
          <div role="group" aria-label="Período" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
            {RANGES.map((option) => {
              const active = option.id === range;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRange(option.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:bg-accent/60"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
              Não há meses neste período.
            </p>
          ) : (
            <>
              <ScopeSwitch scope={scope} onChange={setScope} periodLabel={periodLabel} monthLabel={monthLabel} />
              <section className="flex flex-col gap-3">
                <SectionHeader title="Resumo" scope={scope === "month" && monthLabel ? monthLabel : periodLabel} />
                <SummaryCards scope={scope} summary={summary} point={selectedPoint} />
              </section>
              <section className="flex flex-col gap-3">
                <SectionHeader title="Evolução mês a mês" scope={`${periodLabel} · mês escolhido em destaque`} />
                <MonthlyChart points={visible} selectedKey={selectedKey} onSelect={setPickedKey} />
              </section>
              {/* Phones: one column in reading order. From lg: month table and card on the left, categories on the right. */}
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-x-6">
                <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
                  <SectionHeader title="Tabela mês a mês" scope={periodLabel} />
                  <MonthTable points={visible} selectedKey={selectedKey} onSelect={setPickedKey} />
                </div>
                {selectedKey && (
                  <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
                    <CategoryBreakdown
                      months={months}
                      selectedKey={selectedKey}
                      onSelectMonth={setPickedKey}
                      scope={scope}
                      periodKeys={periodKeys}
                      periodLabel={periodLabel}
                      projectedKeys={projectedKeys}
                    />
                  </div>
                )}
                <div className="lg:col-start-1 lg:row-start-2">
                  <InstallmentsPanel bills={bills} plans={plans} freed={freed} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
