"use client";

import { useMemo, useState } from "react";
import { formatAxisBRL, formatBRLWhole } from "@/lib/analysis/format";
import { refFromKey, shortMonth } from "@/lib/analysis/months";
import type { CategoryMatrix } from "@/lib/analysis/categories";
import { columnPath, niceScale } from "./chart-utils";
import { categoryColor } from "./category-colors";
import { refLabel } from "./labels";
import { useContainerWidth } from "./use-container-width";

const MIN_SLOT = 56;
const MAX_SLOT = 110;
const MIN_BAR_W = 16;
const MAX_BAR_W = 24;
const SEGMENT_GAP = 2;
const TOP = 12;
const AXIS_H = 38;
const Y_AXIS_W = 56;

interface CategoryStackedProps {
  matrix: CategoryMatrix;
  selectedKey: string | null;
  /** Months that are only planned (after the current one): drawn lighter. */
  projectedKeys: Set<string>;
  onSelectMonth: (key: string) => void;
}

/** One column per month, split by category (top categories + "Outras"): how the mix changes over time. */
export function CategoryStacked({ matrix, selectedKey, projectedKeys, onSelectMonth }: CategoryStackedProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [scrollRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const { keys, categories, monthTotals } = matrix;

  const slot = Math.min(MAX_SLOT, Math.max(MIN_SLOT, Math.floor(containerWidth / Math.max(keys.length, 1))));
  const barW = Math.min(MAX_BAR_W, Math.max(MIN_BAR_W, Math.round(slot * 0.34)));
  const plotH = containerWidth >= 640 ? 240 : 190;
  const height = TOP + plotH + AXIS_H;
  const width = keys.length * slot;

  const scale = useMemo(() => niceScale(0, Math.max(0, ...monthTotals)), [monthTotals]);
  const y = (value: number) => TOP + ((scale.hi - value) / (scale.hi - scale.lo)) * plotH;

  const activeKey = hoverKey ?? selectedKey;
  const activeIndex = keys.findIndex((key) => key === activeKey);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
        {categories.map((category, index) => (
          <li key={category.categoria} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: categoryColor(index, category.isOther) }} />
            {category.categoria}
          </li>
        ))}
        {keys.some((key) => projectedKeys.has(key)) && <li className="italic">meses mais claros = previsto</li>}
      </ul>

      <div className="flex">
        <svg width={Y_AXIS_W} height={height} className="shrink-0 text-foreground-secondary" aria-hidden>
          {scale.ticks.map((tick) => (
            <text key={tick} x={Y_AXIS_W - 8} y={y(tick) + 3} textAnchor="end" className="fill-current text-[10px]">
              {formatAxisBRL(tick)}
            </text>
          ))}
        </svg>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
          <svg width={width} height={height} className="block text-foreground" role="group" aria-label="Categorias empilhadas por mês">
            {scale.ticks.map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={tick === 0 ? 1.5 : 1} />
            ))}

            {keys.map((key, monthIndex) => {
              const slotX = monthIndex * slot;
              const x = slotX + (slot - barW) / 2;
              const ref = refFromKey(key);
              const segments = categories
                .map((category, categoryIndex) => ({ category, categoryIndex, value: category.totals[monthIndex] }))
                .filter((segment) => segment.value > 0);
              let cumulative = 0;
              return (
                <g key={key} opacity={projectedKeys.has(key) ? 0.55 : 1}>
                  {key === selectedKey && <rect x={slotX + 2} y={TOP} width={slot - 4} height={plotH} rx={8} fill="currentColor" opacity={0.07} />}
                  {segments.map((segment, position) => {
                    const yBottom = y(cumulative);
                    cumulative += segment.value;
                    const yTop = y(cumulative);
                    const isFirst = position === 0;
                    const isLast = position === segments.length - 1;
                    // A 2px surface gap between touching segments; the outer ends stay flush.
                    const top = yTop + (isLast ? 0 : SEGMENT_GAP / 2);
                    const bottom = yBottom - (isFirst ? 0 : SEGMENT_GAP / 2);
                    if (bottom - top < 1) return null;
                    const fill = categoryColor(segment.categoryIndex, segment.category.isOther);
                    return isLast ? (
                      <path key={segment.category.categoria} d={columnPath(x, top, barW, bottom)} fill={fill} />
                    ) : (
                      <rect key={segment.category.categoria} x={x} y={top} width={barW} height={bottom - top} fill={fill} />
                    );
                  })}
                  <text
                    x={slotX + slot / 2}
                    y={TOP + plotH + 16}
                    textAnchor="middle"
                    className={`text-[11px] ${key === selectedKey ? "fill-foreground font-semibold" : "fill-foreground-secondary"}`}
                  >
                    {shortMonth(ref.month)}
                  </text>
                  {(monthIndex === 0 || ref.month === "Janeiro") && (
                    <text x={slotX + slot / 2} y={TOP + plotH + 30} textAnchor="middle" className="fill-foreground-secondary text-[10px]">
                      {ref.year}
                    </text>
                  )}
                </g>
              );
            })}

            {/* One hit target per month, bigger than the column. */}
            {keys.map((key, monthIndex) => (
              <rect
                key={key}
                x={monthIndex * slot}
                y={0}
                width={slot}
                height={height}
                fill="transparent"
                className="cursor-pointer outline-none focus-visible:stroke-primary"
                strokeWidth={2}
                role="button"
                tabIndex={0}
                aria-pressed={key === selectedKey}
                aria-label={`${refLabel(refFromKey(key))}: ${formatBRLWhole(monthTotals[monthIndex])}`}
                onClick={() => onSelectMonth(key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectMonth(key);
                  }
                }}
                onPointerEnter={(event) => event.pointerType === "mouse" && setHoverKey(key)}
                onPointerLeave={() => setHoverKey(null)}
                onFocus={() => setHoverKey(key)}
                onBlur={() => setHoverKey(null)}
              />
            ))}
          </svg>
        </div>
      </div>

      {activeIndex >= 0 && (
        <div className="rounded-xl bg-muted/50 px-3 py-2.5">
          <p className="mb-1.5 flex items-baseline justify-between gap-3 text-xs font-medium text-foreground-secondary">
            <span>{refLabel(refFromKey(keys[activeIndex]))}</span>
            <span className="tabular-nums text-foreground">{formatBRLWhole(monthTotals[activeIndex])}</span>
          </p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {categories
              .map((category, index) => ({ category, index, value: category.totals[activeIndex] }))
              .filter((entry) => entry.value > 0)
              .sort((a, b) => b.value - a.value)
              .map(({ category, index, value }) => (
                <div key={category.categoria} className="flex items-center justify-between gap-3">
                  <dt className="flex min-w-0 items-center gap-1.5 text-xs text-foreground-secondary">
                    <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: categoryColor(index, category.isOther) }} />
                    <span className="truncate">{category.categoria}</span>
                  </dt>
                  <dd className="text-sm font-medium tabular-nums">{formatBRLWhole(value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}
