"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/analysis/format";
import { shortMonth } from "@/lib/analysis/months";
import type { CategoryPoint } from "@/lib/analysis/categories";
import { columnPath } from "./chart-utils";

const SLOT = 40;
const BAR_W = 14;
const PLOT_H = 72;
const TOP = 6;
const AXIS_H = 18;

/** One category across the months: thin columns, the selected month highlighted, values in the readout below. */
export function MiniBars({
  points,
  color,
  selectedKey,
  onSelect,
}: {
  points: CategoryPoint[];
  color: string;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const max = Math.max(1, ...points.map((point) => point.total));
  const baseline = TOP + PLOT_H;
  const readout = points.find((point) => point.key === (hoverKey ?? selectedKey));

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <svg width={points.length * SLOT} height={TOP + PLOT_H + AXIS_H} className="block text-foreground" role="group" aria-label="Evolução da categoria por mês">
          <line x1={0} x2={points.length * SLOT} y1={baseline} y2={baseline} className="stroke-border" strokeWidth={1} />
          {points.map((point, index) => {
            const selected = point.key === selectedKey;
            const top = baseline - (point.total / max) * PLOT_H;
            return (
              <g key={point.key}>
                {selected && <rect x={index * SLOT + 2} y={0} width={SLOT - 4} height={baseline + AXIS_H} rx={8} fill="currentColor" opacity={0.07} />}
                {point.total > 0 && <path d={columnPath(index * SLOT + (SLOT - BAR_W) / 2, top, BAR_W, baseline)} fill={color} />}
                <text x={index * SLOT + SLOT / 2} y={baseline + 13} textAnchor="middle" className={`text-[10px] ${selected ? "fill-foreground font-semibold" : "fill-foreground-secondary"}`}>
                  {shortMonth(point.month)}
                </text>
                <rect
                  x={index * SLOT}
                  y={0}
                  width={SLOT}
                  height={baseline + AXIS_H}
                  fill="transparent"
                  className="cursor-pointer outline-none"
                  role="button"
                  tabIndex={0}
                  aria-label={`${point.month} ${point.year}: ${formatBRL(point.total)}`}
                  onClick={() => onSelect(point.key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(point.key);
                    }
                  }}
                  onPointerEnter={(event) => event.pointerType === "mouse" && setHoverKey(point.key)}
                  onPointerLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(point.key)}
                  onBlur={() => setHoverKey(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {readout && (
        <p className="text-xs text-foreground-secondary">
          {readout.month} {readout.year}: <span className="font-semibold text-foreground tabular-nums">{formatBRL(readout.total)}</span>
        </p>
      )}
    </div>
  );
}
