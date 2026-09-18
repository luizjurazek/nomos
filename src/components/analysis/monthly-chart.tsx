"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatAxisBRL, formatBRLWhole } from "@/lib/analysis/format";
import { shortMonth } from "@/lib/analysis/months";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { columnPath, niceScale } from "./chart-utils";

const SLOT = 64;
const BAR_W = 14;
const BAR_GAP = 2;
const TOP = 12;
const PLOT_H = 200;
const AXIS_H = 38;
const Y_AXIS_W = 56;
const HEIGHT = TOP + PLOT_H + AXIS_H;

interface Series {
  id: "entradas" | "debitos" | "cartao";
  label: string;
  color: string;
  value: (point: MonthPoint) => number | null;
}

const SERIES: Series[] = [
  { id: "entradas", label: "Entradas", color: TABLE_HEADER_COLORS.entradas, value: (point) => point.entradas },
  { id: "debitos", label: "Débitos", color: TABLE_HEADER_COLORS.debitos, value: (point) => point.debitos },
  { id: "cartao", label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, value: (point) => point.cartao },
];

const GROUP_W = SERIES.length * BAR_W + (SERIES.length - 1) * BAR_GAP;

interface MonthlyChartProps {
  points: MonthPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export function MonthlyChart({ points, selectedKey, onSelect }: MonthlyChartProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scale = useMemo(() => {
    const values = points.flatMap((point) => [point.entradas, point.debitos, point.cartao, point.saldo]).filter((v): v is number => v !== null);
    return niceScale(Math.min(0, ...values), Math.max(0, ...values));
  }, [points]);

  const y = (value: number) => TOP + ((scale.hi - value) / (scale.hi - scale.lo)) * PLOT_H;
  const baseline = y(0);
  const width = points.length * SLOT;

  // Bring the selected month into view when the period changes (not on every selection, so manual scrolling isn't fought).
  const firstKey = points[0]?.key;
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const index = points.findIndex((point) => point.key === selectedKey);
    if (index < 0) return;
    container.scrollLeft = Math.max(0, index * SLOT + SLOT / 2 - container.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, points.length]);

  const activeKey = hoverKey ?? selectedKey;
  const active = points.find((point) => point.key === activeKey) ?? null;

  const saldoPoints = points.map((point, index) => ({ point, x: index * SLOT + SLOT / 2 })).filter((entry) => entry.point.saldo !== null);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <Legend />

      <div className="flex">
        <svg width={Y_AXIS_W} height={HEIGHT} className="shrink-0 text-foreground-secondary" aria-hidden>
          {scale.ticks.map((tick) => (
            <text key={tick} x={Y_AXIS_W - 8} y={y(tick) + 3} textAnchor="end" className="fill-current text-[10px]">
              {formatAxisBRL(tick)}
            </text>
          ))}
        </svg>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
          <svg width={width} height={HEIGHT} className="block text-foreground" role="group" aria-label="Gráfico mensal de entradas, débitos, cartão e saldo">
            <defs>
              {SERIES.map((series) => (
                <pattern key={series.id} id={`hatch-${series.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill={series.color} fillOpacity="0.22" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke={series.color} strokeWidth="2.5" />
                </pattern>
              ))}
            </defs>

            {scale.ticks.map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={tick === 0 ? 1.5 : 1} />
            ))}

            {points.map((point, index) => {
              const slotX = index * SLOT;
              const selected = point.key === selectedKey;
              return (
                <g key={point.key}>
                  {selected && <rect x={slotX + 2} y={TOP} width={SLOT - 4} height={PLOT_H} rx={8} fill="currentColor" opacity={0.07} />}

                  {SERIES.map((series, seriesIndex) => {
                    const value = series.value(point);
                    if (value === null || value <= 0) return null;
                    const x = slotX + (SLOT - GROUP_W) / 2 + seriesIndex * (BAR_W + BAR_GAP);
                    return (
                      <path
                        key={series.id}
                        d={columnPath(x, y(value), BAR_W, baseline)}
                        fill={point.projected ? `url(#hatch-${series.id})` : series.color}
                      />
                    );
                  })}

                  <text
                    x={slotX + SLOT / 2}
                    y={TOP + PLOT_H + 16}
                    textAnchor="middle"
                    className={`text-[11px] ${selected ? "fill-foreground font-semibold" : "fill-foreground-secondary"}`}
                  >
                    {shortMonth(point.month)}
                  </text>
                  {(index === 0 || point.month === "Janeiro") && (
                    <text x={slotX + SLOT / 2} y={TOP + PLOT_H + 30} textAnchor="middle" className="fill-foreground-secondary text-[10px]">
                      {point.year}
                    </text>
                  )}
                </g>
              );
            })}

            {saldoPoints.slice(1).map((entry, index) => {
              const from = saldoPoints[index];
              return (
                <line
                  key={entry.point.key}
                  x1={from.x}
                  y1={y(from.point.saldo!)}
                  x2={entry.x}
                  y2={y(entry.point.saldo!)}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={entry.point.projected ? "4 4" : undefined}
                />
              );
            })}
            {saldoPoints.map(({ point, x }) => (
              <circle
                key={point.key}
                cx={x}
                cy={y(point.saldo!)}
                r={4}
                strokeWidth={2}
                stroke={point.projected ? "currentColor" : "var(--card)"}
                fill={point.projected ? "var(--card)" : "currentColor"}
              />
            ))}

            {/* One hit target per month, much bigger than the marks. */}
            {points.map((point, index) => (
              <rect
                key={point.key}
                x={index * SLOT}
                y={0}
                width={SLOT}
                height={TOP + PLOT_H + AXIS_H}
                fill="transparent"
                className="cursor-pointer outline-none focus-visible:stroke-primary"
                strokeWidth={2}
                role="button"
                tabIndex={0}
                aria-pressed={point.key === selectedKey}
                aria-label={`${point.month} ${point.year}: saldo ${point.saldo === null ? "desconhecido" : formatBRLWhole(point.saldo)}`}
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
            ))}
          </svg>
        </div>
      </div>

      {active && <Readout point={active} />}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
      {SERIES.map((series) => (
        <li key={series.id} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
          {series.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg width="16" height="10" className="text-foreground" aria-hidden>
          <line x1="0" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="5" r="3.5" fill="currentColor" stroke="var(--card)" strokeWidth="1.5" />
        </svg>
        Saldo
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-sm text-foreground-secondary"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 5px)" }}
        />
        Projetado
      </li>
    </ul>
  );
}

function Readout({ point }: { point: MonthPoint }) {
  const rows: { label: string; color?: string; value: number | null; strong?: boolean }[] = [
    { label: "Entradas", color: TABLE_HEADER_COLORS.entradas, value: point.entradas },
    { label: "Débitos", color: TABLE_HEADER_COLORS.debitos, value: point.debitos },
    { label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, value: point.cartao },
    { label: "Saldo", value: point.saldo, strong: true },
  ];

  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
        {point.month} {point.year}
        {point.projected && " · projetado"}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] text-foreground-secondary">
              {row.color ? (
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />
              ) : (
                <span className="h-0.5 w-2 shrink-0 bg-foreground" />
              )}
              <span className="truncate">{row.label}</span>
            </dt>
            <dd className={`text-sm tabular-nums ${row.strong ? "font-semibold" : "font-medium"}`}>
              {row.value === null ? "—" : formatBRLWhole(row.value)}
            </dd>
          </div>
        ))}
      </dl>
      {point.source === "installments" && (
        <p className="mt-2 text-[11px] text-foreground-secondary">
          Mês sem aba: só a fatura do cartão é conhecida (compras do último mês e parcelas já contratadas).
        </p>
      )}
    </div>
  );
}
