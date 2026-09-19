"use client";

import { useState } from "react";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { formatAxisBRL, formatBRL } from "@/lib/analysis/format";
import type { FreedAmount } from "@/lib/analysis/installments";
import { shortMonth } from "@/lib/analysis/months";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { formatCurrency } from "@/lib/format/currency";
import { niceScale } from "./chart-utils";
import { DeltaText } from "./delta-text";
import { useContainerWidth } from "./use-container-width";

const MIN_SLOT = 56;
const TOP = 24;
const AXIS_H = 38;
const Y_AXIS_W = 56;
const MIN_LABEL_W = 70;

interface Series {
  id: "total" | "installments" | "others";
  label: string;
  color: string;
  value: (bill: Bill) => number;
  width: number;
}

// Each series is a line at its own value, so nothing has to be read as a stack.
const SERIES: Series[] = [
  { id: "total", label: "Fatura", color: TABLE_HEADER_COLORS.nubank, value: (bill) => bill.total, width: 2.5 },
  { id: "installments", label: "Parcelas", color: "var(--warning)", value: (bill) => bill.installments, width: 2 },
  { id: "others", label: "Demais compras", color: "var(--primary)", value: (bill) => bill.others, width: 2 },
];

interface CardBillsChartProps {
  /** The upcoming bills, in order. */
  bills: MonthPoint[];
  /** Part of each bill (by month key) that is installments. */
  installmentBills: Map<string, number>;
  freed: FreedAmount[];
}

interface Bill {
  point: MonthPoint;
  total: number;
  installments: number;
  others: number;
}

/** Time series of the next card bills: total, installments and other purchases, each as its own line. */
export function CardBillsChart({ bills, installmentBills, freed }: CardBillsChartProps) {
  const [scrollRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<Series["id"]>>(new Set());

  const visible = SERIES.filter((series) => !hidden.has(series.id));
  const toggle = (id: Series["id"]) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      // Always keep at least one line on screen.
      else if (visible.length > 1) next.add(id);
      return next;
    });

  const items: Bill[] = bills.map((point) => {
    const installments = Math.min(point.cartao, installmentBills.get(point.key) ?? 0);
    return { point, total: point.cartao, installments, others: point.cartao - installments };
  });
  const freedByKey = new Map(freed.map((item) => [item.key, item]));

  // Everything from the first projected bill onwards is shaded as one band.
  const projectionStart = items.findIndex((item) => item.point.projected);

  // Slots stretch to fill the container; below the minimum the chart scrolls horizontally instead.
  const slot = Math.max(MIN_SLOT, containerWidth / Math.max(items.length, 1));
  const plotH = containerWidth >= 640 ? 220 : 180;
  const height = TOP + plotH + AXIS_H;
  const width = items.length * slot;

  // The scale follows the visible lines, so a filtered view doesn't stay squashed at the bottom.
  const scale = niceScale(0, Math.max(0, ...items.flatMap((item) => visible.map((series) => series.value(item)))));
  const y = (value: number) => TOP + ((scale.hi - value) / (scale.hi - scale.lo)) * plotH;
  const x = (index: number) => index * slot + slot / 2;

  const activeKey = hoverKey ?? pickedKey ?? items[0]?.point.key;
  const activeIndex = Math.max(0, items.findIndex((item) => item.point.key === activeKey));
  const active = items[activeIndex];
  if (!active) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground-secondary">
        {SERIES.map((series) => {
          const shown = !hidden.has(series.id);
          return (
            <li key={series.id}>
              <button
                type="button"
                aria-pressed={shown}
                onClick={() => toggle(series.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  shown ? "border-border bg-muted/50 text-foreground" : "border-transparent text-foreground-secondary line-through opacity-60 hover:opacity-100"
                }`}
              >
                <svg width="18" height="12" aria-hidden>
                  <line x1="0" y1="6" x2="18" y2="6" stroke={series.color} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="6" r="4" fill={series.color} stroke="var(--card)" strokeWidth="2" />
                </svg>
                {series.label}
              </button>
            </li>
          );
        })}
        <li className="flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <polygon points="0,1 10,1 5,9" className="fill-success" />
          </svg>
          Parcelas acabam
        </li>
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
          <svg width={width} height={height} className="block text-foreground" role="group" aria-label="Fatura do cartão por mês, com parcelas e demais compras">
            {scale.ticks.map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={tick === 0 ? 1.5 : 1} />
            ))}

            {projectionStart >= 0 && (
              <g>
                <rect x={projectionStart * slot} y={TOP} width={(items.length - projectionStart) * slot} height={plotH} fill="currentColor" opacity={0.06} />
                {(items.length - projectionStart) * slot >= MIN_LABEL_W && (
                  <text x={projectionStart * slot + 6} y={TOP - 6} className="fill-foreground-secondary text-[10px] font-medium">
                    Projeção →
                  </text>
                )}
              </g>
            )}

            <line x1={x(activeIndex)} x2={x(activeIndex)} y1={TOP} y2={TOP + plotH} stroke="currentColor" strokeWidth={1} opacity={0.25} />

            {visible.map((series) => (
              <g key={series.id}>
                {items.slice(1).map((item, index) => (
                  <line
                    key={item.point.key}
                    x1={x(index)}
                    y1={y(series.value(items[index]))}
                    x2={x(index + 1)}
                    y2={y(series.value(item))}
                    stroke={series.color}
                    strokeWidth={series.width}
                    strokeLinecap="round"
                  />
                ))}
                {items.map((item, index) => (
                  <circle
                    key={item.point.key}
                    cx={x(index)}
                    cy={y(series.value(item))}
                    r={index === activeIndex ? 5 : 4}
                    fill={series.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ))}
            {items.map((item, index) =>
              freedByKey.has(item.point.key) && !hidden.has("installments") ? (
                <polygon
                  key={item.point.key}
                  points={`${x(index) - 5},${y(item.installments) - 16} ${x(index) + 5},${y(item.installments) - 16} ${x(index)},${y(item.installments) - 8}`}
                  className="fill-success"
                />
              ) : null,
            )}

            {items.map((item, index) => {
              const selected = item.point.key === pickedKey || (pickedKey === null && index === 0);
              return (
                <g key={item.point.key}>
                  <text x={x(index)} y={TOP + plotH + 16} textAnchor="middle" className={`text-[11px] ${selected ? "fill-foreground font-semibold" : "fill-foreground-secondary"}`}>
                    {shortMonth(item.point.month)}
                  </text>
                  {(index === 0 || item.point.month === "Janeiro") && (
                    <text x={x(index)} y={TOP + plotH + 30} textAnchor="middle" className="fill-foreground-secondary text-[10px]">
                      {item.point.year}
                    </text>
                  )}
                  <rect
                    x={index * slot}
                    y={0}
                    width={slot}
                    height={height}
                    fill="transparent"
                    className="cursor-pointer outline-none focus-visible:stroke-primary"
                    strokeWidth={2}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${item.point.month} ${item.point.year}: fatura ${formatBRL(item.total)}`}
                    onClick={() => setPickedKey(item.point.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setPickedKey(item.point.key);
                      }
                    }}
                    onPointerEnter={(event) => event.pointerType === "mouse" && setHoverKey(item.point.key)}
                    onPointerLeave={() => setHoverKey(null)}
                    onFocus={() => setHoverKey(item.point.key)}
                    onBlur={() => setHoverKey(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <Readout hidden={hidden} item={active} prev={items[activeIndex - 1] ?? null} next={items[activeIndex + 1] ?? null} drop={freedByKey.get(active.point.key)} />
    </div>
  );
}

function Readout({ hidden, item, prev, next, drop }: { hidden: ReadonlySet<Series["id"]>; item: Bill; prev: Bill | null; next: Bill | null; drop: FreedAmount | undefined }) {
  const neighbours = [prev, next].filter((bill): bill is Bill => bill !== null);

  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
        {item.point.month} {item.point.year}
        {item.point.source === "installments" ? " · só parcelas já contratadas" : item.point.projected ? " · planejado na planilha" : ""}
      </p>
      {neighbours.length > 0 && (
        <p className="mb-2 text-[11px] text-foreground-secondary">
          Variação de {item.point.month} em relação ao mês anterior e ao posterior
        </p>
      )}
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
        {SERIES.map((figure) => {
          const value = figure.value(item);
          return (
            <div key={figure.label} className={`min-w-0 ${hidden.has(figure.id) ? "opacity-40" : ""}`}>
              <dt className="flex items-center gap-1.5 break-words text-[11px] text-foreground-secondary">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: figure.color }} />
                {figure.label}
              </dt>
              <dd className={`text-sm tabular-nums ${figure.id === "total" ? "font-semibold" : "font-medium"}`}>{formatBRL(value)}</dd>
              {neighbours.map((other) => (
                <dd key={other.point.key} className="flex flex-col text-[11px] tabular-nums text-foreground-secondary sm:flex-row sm:justify-between sm:gap-2">
                  <span>vs {shortMonth(other.point.month)}</span>
                  <DeltaText current={value} reference={figure.value(other)} better="down" />
                </dd>
              ))}
            </div>
          );
        })}
      </dl>
      {drop && (
        <p className="mt-2 text-xs text-success">
          A fatura cai <span className="font-medium tabular-nums">{formatCurrency(drop.amount)}</span> · terminam {drop.names.join(", ")}
        </p>
      )}
    </div>
  );
}
