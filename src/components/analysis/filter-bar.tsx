"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { refFromKey, shortMonth } from "@/lib/analysis/months";
import { customBounds, customRange, isCustomRange, type RangeId, type RangeOption } from "@/lib/analysis/ranges";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { SavingsToggle } from "./savings-toggle";

/** A single month is looked at in detail (with the change vs the month before); several months, as a whole. */
export type Scope = "period" | "month";

interface FilterFabProps {
  ranges: RangeOption[];
  range: RangeId;
  onRange: (range: RangeId) => void;
  /** Every month there is, for the custom "from"/"to" pickers. */
  timeline: MonthPoint[];
  /** The months the chosen period covers. */
  visible: MonthPoint[];
  /** Whether anything differs from the default view (default period, no savings). */
  filtered: boolean;
  /** Back to the default view. */
  onReset: () => void;
  withSavings: boolean;
  onWithSavings: (value: boolean) => void;
}

const CHIP = "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9";
const CHIP_ON = "border-foreground bg-foreground text-background";
const CHIP_OFF = "border-border text-foreground-secondary hover:bg-accent/60";
const SELECT = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm sm:min-h-9";

/** "Set/26": the year keeps months of different years apart. */
function monthOption(point: MonthPoint): string {
  const ref = refFromKey(point.key);
  return `${shortMonth(ref.month)}/${ref.year.slice(2)}${point.projected ? " (previsto)" : ""}`;
}

/**
 * Floating filter button (same spot and shape as the "new entry" one on the month screen). It opens a sheet
 * with one period, which every block of the page follows (summary, chart, table and categories), and the
 * "include savings" switch. A single month is just a period of one month. Choices apply right away.
 */
export function FilterFab({ ranges, range, onRange, timeline, visible, filtered, onReset, withSavings, onWithSavings }: FilterFabProps) {
  const [open, setOpen] = useState(false);
  const custom = isCustomRange(range);
  const bounds = custom ? customBounds(range) : null;
  const monthsCount = visible.length;

  // Starts the custom span from the months already on screen, so switching to it changes nothing at first.
  const startCustom = () => {
    const span = visible.length > 0 ? visible : timeline;
    if (custom || span.length === 0) return;
    onRange(customRange(span[0].key, span[span.length - 1].key));
  };

  return (
    <>
      {/* Small X on the button's top-right corner, so the filters can be dropped without opening the sheet. */}
      {filtered && (
        <button
          type="button"
          onClick={onReset}
          aria-label="Limpar filtros"
          className="fixed right-5 bottom-[4.25rem] z-30 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-background after:absolute after:-inset-2"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      {/* Light on the default view; the primary color once the period or the savings differ from it. */}
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
        <DialogContent className="max-h-[88dvh] overflow-y-auto max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:data-open:slide-in-from-bottom-10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg leading-tight font-semibold">Filtrar análise</DialogTitle>
            <DialogDescription>O período vale para a página toda: resumo, gráfico, tabela e categorias.</DialogDescription>
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
              <button type="button" aria-pressed={custom} onClick={startCustom} className={`${CHIP} ${custom ? CHIP_ON : CHIP_OFF}`}>
                Personalizado
              </button>
            </div>

            {bounds && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  De
                  <select
                    className={SELECT}
                    value={bounds.from}
                    onChange={(event) => onRange(customRange(event.target.value, bounds.to < event.target.value ? event.target.value : bounds.to))}
                  >
                    {timeline.map((point) => (
                      <option key={point.key} value={point.key}>
                        {monthOption(point)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-foreground-secondary">
                  Até
                  <select
                    className={SELECT}
                    value={bounds.to}
                    onChange={(event) =>
                      onRange(customRange(bounds.from > event.target.value ? event.target.value : bounds.from, event.target.value))
                    }
                  >
                    {timeline.map((point) => (
                      <option key={point.key} value={point.key}>
                        {monthOption(point)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <p className="text-xs text-foreground-secondary">
              {monthsCount === 0
                ? "Nenhum mês neste período."
                : monthsCount === 1
                  ? "1 mês: o resumo e as categorias mostram a variação em relação ao mês anterior."
                  : `${monthsCount} meses: o resumo e as categorias mostram o total e a média do período.`}
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Valores</h3>
            <SavingsToggle withSavings={withSavings} onChange={onWithSavings} />
          </section>

          <div className="flex gap-2">
            {filtered && (
              <Button variant="outline" className="h-11 flex-1 text-base sm:h-9 sm:text-sm" onClick={onReset}>
                Limpar
              </Button>
            )}
            <Button className="h-11 flex-1 text-base sm:h-9 sm:text-sm" onClick={() => setOpen(false)}>
              Pronto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
