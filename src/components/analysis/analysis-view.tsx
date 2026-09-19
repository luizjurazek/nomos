"use client";

import { useMemo, useState } from "react";
import { freedByMonth, installmentsByBill, listInstallmentPlans, listLedgerPlans, summarizePlans, upcomingBills } from "@/lib/analysis/installments";
import { refFromKey, type Now } from "@/lib/analysis/months";
import { currentKeyOf, pointsInRange, rangeOptions, type RangeId } from "@/lib/analysis/ranges";
import { buildTimeline, pickReferenceMonth, summarizePeriod, viewPoints } from "@/lib/analysis/timeline";
import type { AnalysisMonth } from "@/lib/analysis/types";
import { CategoryBreakdown } from "./category-breakdown";
import { InstallmentsPanel } from "./installments-panel";
import { FilterFab, type Scope } from "./filter-bar";
import { refLabel } from "./labels";
import { MonthlyChart } from "./monthly-chart";
import { CarryInstallmentsButton } from "./carry-installments-button";
import { RefreshButton } from "./refresh-button";
import { SectionHeader } from "./section-header";
import { SummaryCards } from "./summary-cards";

const NEXT_BILLS = 6;

interface AnalysisViewProps {
  months: AnalysisMonth[];
  now: Now;
}

export function AnalysisView({ months, now }: AnalysisViewProps) {
  const [range, setRange] = useState<RangeId>("year");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  // The current month is in focus by default; "all months" is one tap away in the filters.
  const [scope, setScope] = useState<Scope>("month");
  // Day to day by default; with savings the numbers are the sheet's own (see viewPoint).
  const [withSavings, setWithSavings] = useState(false);

  const timeline = useMemo(() => buildTimeline(months, now), [months, now]);
  const currentKey = currentKeyOf(now);
  const ranges = useMemo(() => rangeOptions(timeline, now), [timeline, now]);
  const visible = useMemo(() => pointsInRange(timeline, range, now), [timeline, range, now]);

  // Choosing a period means looking at the period: every month of it, with any earlier month pick dropped.
  const changeRange = (next: RangeId) => {
    setRange(next);
    setPickedKey(null);
    setScope("period");
  };
  // Back to the default view: the default month in focus, savings left out. The period itself is not a filter, so it stays.
  const resetFilters = () => {
    setPickedKey(null);
    setScope("month");
    setWithSavings(false);
  };
  // Picking a month anywhere (filter, chart, table, categories) focuses the summary and the categories on it.
  const focusMonth = (key: string | null) => {
    if (key === null) {
      setScope("period");
      return;
    }
    setPickedKey(key);
    setScope("month");
  };

  // Default month: the current one, else the closest tab before it.
  const defaultKey = useMemo(() => {
    if (visible.some((point) => point.key === currentKey)) return currentKey;
    const sheet = visible.filter((point) => point.source === "sheet");
    return (sheet.filter((point) => point.key <= currentKey).at(-1) ?? sheet[0] ?? visible[0])?.key ?? null;
  }, [visible, currentKey]);
  // The picked month wins while it is on screen.
  const selectedKey = pickedKey && visible.some((point) => point.key === pickedKey) ? pickedKey : defaultKey;
  const filtered = withSavings || scope === "period" || selectedKey !== defaultKey;

  const summary = useMemo(() => summarizePeriod(visible, withSavings), [visible, withSavings]);
  const shown = useMemo(() => viewPoints(visible, withSavings), [visible, withSavings]);
  const selectedPoint = useMemo(() => visible.find((point) => point.key === selectedKey) ?? null, [visible, selectedKey]);
  // Months of the period with a tab: the only ones that have categories.
  const periodKeys = useMemo(() => visible.filter((point) => point.source === "sheet").map((point) => point.key), [visible]);
  const projectedKeys = useMemo(() => new Set(visible.filter((point) => point.projected).map((point) => point.key)), [visible]);
  const periodLabel = ranges.find((option) => option.id === range)?.label ?? "";
  const monthLabel = selectedKey ? refLabel(refFromKey(selectedKey)) : null;

  const reference = useMemo(() => pickReferenceMonth(months, now), [months, now]);
  const plans = useMemo(() => (reference ? listInstallmentPlans(reference) : []), [reference]);
  const ledgerPlans = useMemo(() => (reference ? listLedgerPlans(reference) : []), [reference]);
  const freed = useMemo(() => freedByMonth(plans), [plans]);
  const bills = useMemo(() => upcomingBills(timeline, currentKey, freed, NEXT_BILLS), [timeline, currentKey, freed]);
  const installmentBills = useMemo(() => installmentsByBill(plans), [plans]);
  const plansTotals = useMemo(() => summarizePlans(plans), [plans]);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Análise</h1>
          <p className="text-sm text-foreground-secondary">
            {timeline.length === 0 || visible.length === 0
              ? "Projeção mês a mês e categorias"
              : `${periodLabel} · ${scope === "month" && monthLabel ? monthLabel : "todos os meses"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CarryInstallmentsButton />
          <RefreshButton />
        </div>
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          Não encontrei nenhum mês nas planilhas configuradas.
        </p>
      ) : (
        <>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
              Não há meses neste período.
            </p>
          ) : (
            <>
              <section className="flex flex-col gap-3">
                <SectionHeader title="Resumo" scope={scope === "month" && monthLabel ? monthLabel : periodLabel} />
                <SummaryCards scope={scope} summary={summary} point={selectedPoint} withSavings={withSavings} />
              </section>
              <section className="flex flex-col gap-3">
                <SectionHeader title="Evolução mês a mês" scope={`${periodLabel} · mês escolhido em destaque`} />
                <MonthlyChart points={shown} selectedKey={selectedKey} onSelect={focusMonth} withSavings={withSavings} />
              </section>
              {/* Each section takes the full width, one after the other. */}
              <div className="flex flex-col gap-5">
                {selectedKey && (
                  <div>
                    <CategoryBreakdown
                      months={months}
                      selectedKey={selectedKey}
                      onSelectMonth={focusMonth}
                      scope={scope}
                      periodKeys={periodKeys}
                      periodLabel={periodLabel}
                      projectedKeys={projectedKeys}
                      withSavings={withSavings}
                    />
                  </div>
                )}
                <div>
                  <InstallmentsPanel bills={bills} plans={plans} ledgerPlans={ledgerPlans} freed={freed} installmentBills={installmentBills} totals={plansTotals} />
                </div>
              </div>
            </>
          )}
        </>
      )}
      {timeline.length > 0 && (
        <FilterFab
          ranges={ranges}
          range={range}
          onRange={changeRange}
          points={visible}
          scope={scope}
          selectedKey={selectedKey}
          onMonth={focusMonth}
          filtered={filtered}
          onReset={resetFilters}
          withSavings={withSavings}
          onWithSavings={setWithSavings}
        />
      )}
    </div>
  );
}
