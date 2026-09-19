"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { refFromKey, shortMonth } from "@/lib/analysis/months";
import type { RangeId, RangeOption } from "@/lib/analysis/ranges";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { SavingsToggle } from "./savings-toggle";

/** Do the summary and the categories describe the whole period or just one month? */
export type Scope = "period" | "month";

interface FilterFabProps {
  ranges: RangeOption[];
  range: RangeId;
  onRange: (range: RangeId) => void;
  /** Months of the chosen period, for the month picker. */
  points: MonthPoint[];
  scope: Scope;
  selectedKey: string | null;
  /** null = the whole period. */
  onMonth: (key: string | null) => void;
  withSavings: boolean;
  onWithSavings: (value: boolean) => void;
}

const CHIP = "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9";
const CHIP_ON = "border-foreground bg-foreground text-background";
const CHIP_OFF = "border-border text-foreground-secondary hover:bg-accent/60";

/** "Set/26": short enough for a three-column grid; the year keeps periods that span several years apart. */
function monthChip(point: MonthPoint): string {
  const ref = refFromKey(point.key);
  return `${shortMonth(ref.month)}/${ref.year.slice(2)}`;
}

/**
 * Floating filter button (same spot and shape as the "new entry" one on the month screen). It opens a sheet
 * with the two choices: the period (what the chart and the table cover) and, inside it, the whole period or
 * one month (what the summary and the categories describe). Choices apply right away.
 */
export function FilterFab({ ranges, range, onRange, points, scope, selectedKey, onMonth, withSavings, onWithSavings }: FilterFabProps) {
  const [open, setOpen] = useState(false);
  const focused = scope === "month" && selectedKey !== null;
  // The button lights up whenever something differs from the default view.
  const filtered = focused || withSavings;
  // Back to the default view: the whole period, savings left out. The period itself is not a filter, so it stays.
  const clear = () => {
    onMonth(null);
    onWithSavings(false);
  };

  return (
    <>
      {/* Small X on the button's top-right corner, so the filters can be dropped without opening the sheet. */}
      {filtered && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar filtros"
          className="fixed right-5 bottom-[4.25rem] z-30 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-background after:absolute after:-inset-2"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      {/* Light on the default view; the primary color once a month is in focus or savings are included. */}
      <Button
        size="icon"
        variant={filtered ? "default" : "secondary"}
        onClick={() => setOpen(true)}
        className={`fixed right-6 bottom-6 z-20 size-14 rounded-full shadow-lg ${filtered ? "" : "ring-1 ring-border"}`}
        aria-label={filtered ? "Filtrar análise (filtros aplicados)" : "Filtrar análise"}
      >
        <SlidersHorizontal className="size-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[88dvh] overflow-y-auto max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:data-open:slide-in-from-bottom-10 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg leading-tight font-semibold">Filtrar análise</DialogTitle>
            <DialogDescription>O período vale para o gráfico e a tabela; o mês, para o resumo e as categorias; a poupança, para todos os valores.</DialogDescription>
          </DialogHeader>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Período</h3>
            <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
              {ranges.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === range}
                  onClick={() => onRange(option.id)}
                  className={`${CHIP} ${option.id === range ? CHIP_ON : CHIP_OFF}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Mês</h3>
            <button
              type="button"
              aria-pressed={!focused}
              onClick={() => onMonth(null)}
              className={`${CHIP} w-full ${!focused ? CHIP_ON : CHIP_OFF}`}
            >
              Todos os meses do período
            </button>
            <div role="group" aria-label="Mês" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {points.map((point) => {
                const active = focused && point.key === selectedKey;
                return (
                  <button
                    key={point.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onMonth(point.key)}
                    title={point.source === "installments" ? "Só a fatura do cartão é conhecida" : point.projected ? "Previsto" : undefined}
                    className={`${CHIP} px-2 ${active ? CHIP_ON : CHIP_OFF} ${point.projected && !active ? "border-dashed" : ""}`}
                  >
                    {monthChip(point)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-foreground-secondary">Meses tracejados são previstos.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Valores</h3>
            <SavingsToggle withSavings={withSavings} onChange={onWithSavings} />
          </section>

          <Button className="h-11 w-full text-base sm:h-9 sm:text-sm" onClick={() => setOpen(false)}>
            Pronto
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
