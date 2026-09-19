"use client";

import { formatBRL, formatCompact } from "@/lib/analysis/format";
import { refFromKey, shortMonth } from "@/lib/analysis/months";
import type { CategoryKind, CategoryMatrix } from "@/lib/analysis/categories";
import { heatColor, heatTextColor } from "./category-colors";
import { refLabel } from "./labels";

const STEPS = [0, 1, 2, 3, 4];

/** Which of the five ramp steps a value falls in, relative to the biggest month of its own category. */
function stepFor(value: number, rowMax: number): number {
  return Math.min(4, Math.floor((value / rowMax) * 5));
}

interface CategoryHeatmapProps {
  matrix: CategoryMatrix;
  kind: CategoryKind;
  selectedKey: string | null;
  projectedKeys: Set<string>;
  onSelectMonth: (key: string) => void;
}

/**
 * Category × month table. Color runs from the category's lowest to its highest month, so peaks stand
 * out even for small categories; the numbers are written in the cells, so this is also the text view.
 */
export function CategoryHeatmap({ matrix, kind, selectedKey, projectedKeys, onSelectMonth }: CategoryHeatmapProps) {
  const { keys, categories, monthTotals, total } = matrix;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-separate border-spacing-0 text-xs tabular-nums">
          <thead>
            <tr className="text-foreground-secondary">
              <th className="sticky left-0 z-10 min-w-32 bg-card px-3 py-2 text-left font-medium">Categoria</th>
              {keys.map((key) => {
                const ref = refFromKey(key);
                const selected = key === selectedKey;
                return (
                  <th key={key} scope="col" className={`min-w-14 px-1 py-1 text-center font-medium ${selected ? "text-foreground" : ""}`}>
                    <button
                      type="button"
                      onClick={() => onSelectMonth(key)}
                      aria-pressed={selected}
                      aria-label={refLabel(ref)}
                      className={`w-full rounded-md px-1 py-1 ${selected ? "bg-muted font-semibold" : ""} ${projectedKeys.has(key) ? "italic" : ""}`}
                    >
                      {shortMonth(ref.month)}
                      <span className="block text-[10px] font-normal opacity-70">{ref.year.slice(2)}</span>
                    </button>
                  </th>
                );
              })}
              <th className="min-w-20 px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const rowMax = Math.max(...category.totals);
              return (
                <tr key={category.categoria}>
                  <th scope="row" className="sticky left-0 z-10 max-w-40 break-words border-t border-border bg-card px-3 py-1.5 text-left font-medium">
                    {category.categoria}
                  </th>
                  {category.totals.map((value, index) => {
                    const key = keys[index];
                    const step = value > 0 ? stepFor(value, rowMax) : null;
                    return (
                      <td key={key} className="border-t border-border p-0.5">
                        <div
                          title={`${category.categoria} · ${refLabel(refFromKey(key))}: ${formatBRL(value)}`}
                          className={`flex h-8 items-center justify-center rounded-md ${key === selectedKey ? "ring-2 ring-foreground/40 ring-inset" : ""}`}
                          style={step === null ? undefined : { backgroundColor: heatColor(kind, step), color: heatTextColor(step) }}
                        >
                          {step === null ? <span className="text-foreground-secondary opacity-50">–</span> : formatCompact(value)}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-t border-border px-3 py-1.5 text-right font-medium">{formatBRL(category.total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <th scope="row" className="sticky left-0 z-10 border-t border-border bg-card px-3 py-2 text-left">Total do mês</th>
              {monthTotals.map((value, index) => (
                <td key={keys[index]} className="border-t border-border px-1 py-2 text-center">
                  {formatCompact(value)}
                </td>
              ))}
              <td className="border-t border-border px-3 py-2 text-right">{formatBRL(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-foreground-secondary">
        <span>Menos</span>
        <span className="flex gap-0.5">
          {STEPS.map((step) => (
            <span key={step} className="h-3 w-6 first:rounded-l-sm last:rounded-r-sm" style={{ backgroundColor: heatColor(kind, step) }} />
          ))}
        </span>
        <span>mais, dentro de cada categoria · valores em R$ (mil = 1.000)</span>
      </div>
    </div>
  );
}
