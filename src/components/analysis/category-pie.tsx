"use client";

import { useMemo, useState } from "react";
import { pieSlices } from "@/lib/analysis/categories";
import { formatBRL, formatPercent } from "@/lib/analysis/format";
import { CATEGORY_COLORS, categoryColor } from "./category-colors";

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 92;

interface CategoryPieProps {
  rows: { categoria: string; total: number }[];
  /** Label for the whole pie ("Saídas", "Entradas"), shown above the total. */
  totalLabel: string;
}

/** Point on the circle at `fraction` of a full turn, starting at 12 o'clock and going clockwise. */
function pointAt(fraction: number, radius: number) {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function slicePath(start: number, end: number): string {
  const from = pointAt(start, RADIUS);
  const to = pointAt(end, RADIUS);
  const largeArc = end - start > 0.5 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${to.x} ${to.y} Z`;
}

/** Share of each category in the total: every category (only past the palette size the smallest ones are grouped as "Outras"). Tap or hover a slice (or a legend row) to read it. */
export function CategoryPie({ rows, totalLabel }: CategoryPieProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const slices = useMemo(() => pieSlices(rows, CATEGORY_COLORS), [rows]);
  const total = useMemo(() => slices.reduce((acc, slice) => acc + slice.total, 0), [slices]);

  // Start angle of each slice, as a fraction of the turn: the shares of the slices before it.
  const starts = useMemo(() => slices.map((_, index) => slices.slice(0, index).reduce((acc, slice) => acc + slice.share, 0)), [slices]);

  const activeIndex = hovered ?? picked;
  const active = activeIndex === null ? null : slices[activeIndex];
  const toggle = (index: number) => setPicked((current) => (current === index ? null : index));

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-52 text-foreground" role="img" aria-label={`Divisão de ${totalLabel.toLowerCase()} por categoria`}>
          {slices.length === 1 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={categoryColor(0, slices[0].isOther)} />
          ) : (
            slices.map((slice, index) => (
              <path
                key={slice.categoria}
                d={slicePath(starts[index], starts[index] + slice.share)}
                fill={categoryColor(index, slice.isOther)}
                // A surface-colored stroke separates touching slices without extra gaps in the data.
                className="cursor-pointer stroke-card transition-opacity"
                strokeWidth={2}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => toggle(index)}
              />
            ))
          )}
        </svg>
        <p className="min-h-10 text-center text-xs text-foreground-secondary">
          {active ? (
            <>
              <span className="font-medium text-foreground">{active.categoria}</span>
              <br />
              <span className="tabular-nums">
                {formatBRL(active.total)} · {formatPercent(active.share)}
              </span>
            </>
          ) : (
            <>
              {totalLabel}
              <br />
              <span className="font-medium tabular-nums text-foreground">{formatBRL(total)}</span>
            </>
          )}
        </p>
      </div>

      <ul className="flex w-full min-w-0 flex-1 flex-col divide-y divide-border">
        {slices.map((slice, index) => (
          <li key={slice.categoria}>
            <button
              type="button"
              aria-pressed={picked === index}
              onClick={() => toggle(index)}
              onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/40"
            >
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: categoryColor(index, slice.isOther) }} />
              <span className="min-w-0 flex-1 break-words text-sm">{slice.categoria}</span>
              <span className="shrink-0 text-xs text-foreground-secondary tabular-nums">{formatPercent(slice.share)}</span>
              <span className="w-28 shrink-0 text-right text-sm font-medium tabular-nums">{formatBRL(slice.total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
