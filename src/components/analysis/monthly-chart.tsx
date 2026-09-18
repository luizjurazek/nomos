"use client";

import { useEffect, useMemo, useState } from "react";
import { formatAxisBRL, formatBRLWhole } from "@/lib/analysis/format";
import { shortMonth } from "@/lib/analysis/months";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { columnPath, niceScale } from "./chart-utils";
import { SAVINGS_COLOR } from "./colors";
import { useContainerWidth } from "./use-container-width";

/** Slot width per month: at least this, growing to fill the card on wide screens (up to MAX_SLOT). */
const MIN_SLOT = 76;
const MIN_SLOT_LINES = 56;
const MAX_SLOT = 120;
/** Room to the right of the last month for the direct labels of the line view. */
const END_LABEL_PAD = 76;
const MIN_BAR_W = 14;
/** Bars never get thicker than the mark spec allows. */
const MAX_BAR_W = 24;
const BAR_GAP = 2;
const TOP = 12;
const AXIS_H = 38;
const Y_AXIS_W = 56;

interface Series {
  id: "entradas" | "debitos" | "cartao" | "poupado";
  label: string;
  color: string;
  value: (point: MonthPoint) => number | null;
}

const SERIES: Series[] = [
  { id: "entradas", label: "Entradas", color: TABLE_HEADER_COLORS.entradas, value: (point) => point.entradas },
  { id: "debitos", label: "Débitos", color: TABLE_HEADER_COLORS.debitos, value: (point) => point.debitos },
  { id: "cartao", label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, value: (point) => point.cartao },
  { id: "poupado", label: "Poupado", color: SAVINGS_COLOR, value: (point) => point.poupado },
];

type View = "bars" | "lines";
type Shape = "circle" | "square" | "diamond";

interface LineSeries {
  id: "entradas" | "saidas" | "poupado" | "saldo";
  label: string;
  color: string;
  /** A second channel besides color, so the series stay apart for everyone. */
  shape: Shape;
  value: (point: MonthPoint) => number | null;
}

const LINE_SERIES: LineSeries[] = [
  { id: "entradas", label: "Entradas", color: TABLE_HEADER_COLORS.entradas, shape: "circle", value: (point) => point.entradas },
  // Only known when the month has a tab: past the last tab we just don't know the débitos.
  { id: "saidas", label: "Saídas", color: TABLE_HEADER_COLORS.debitos, shape: "square", value: (point) => (point.debitos === null ? null : point.debitos + point.cartao) },
  { id: "poupado", label: "Poupado", color: SAVINGS_COLOR, shape: "diamond", value: (point) => point.poupado },
  { id: "saldo", label: "Saldo", color: "var(--foreground)", shape: "circle", value: (point) => point.saldo },
];

const VIEWS: { id: View; label: string }[] = [
  { id: "bars", label: "Barras" },
  { id: "lines", label: "Linhas" },
];

interface MonthlyChartProps {
  points: MonthPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export function MonthlyChart({ points, selectedKey, onSelect }: MonthlyChartProps) {
  const [view, setView] = useState<View>("bars");
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [scrollRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const lines = view === "lines";

  // Slots grow to fill the card; the line view keeps room on the right for the end labels.
  const pad = lines ? END_LABEL_PAD : 0;
  const minSlot = lines ? MIN_SLOT_LINES : MIN_SLOT;
  const slot = Math.min(MAX_SLOT, Math.max(minSlot, Math.floor((containerWidth - pad) / Math.max(points.length, 1))));
  const barW = Math.min(MAX_BAR_W, Math.max(MIN_BAR_W, Math.round(slot * 0.2)));
  const groupW = SERIES.length * barW + (SERIES.length - 1) * BAR_GAP;
  const plotH = containerWidth >= 640 ? 260 : 200;
  const height = TOP + plotH + AXIS_H;

  const scale = useMemo(() => {
    const values = lines
      ? points.flatMap((point) => LINE_SERIES.map((series) => series.value(point)))
      : points.flatMap((point) => [point.entradas, point.debitos, point.cartao, point.poupado, point.saldo]);
    const known = values.filter((value): value is number => value !== null);
    return niceScale(Math.min(0, ...known), Math.max(0, ...known));
  }, [points, lines]);

  const y = (value: number) => TOP + ((scale.hi - value) / (scale.hi - scale.lo)) * plotH;
  const baseline = y(0);
  const width = points.length * slot + pad;

  // Bring the selected month into view when the period or the view changes (not on every selection, so manual scrolling isn't fought).
  const firstKey = points[0]?.key;
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const index = points.findIndex((point) => point.key === selectedKey);
    if (index < 0) return;
    container.scrollLeft = Math.max(0, index * slot + slot / 2 - container.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, points.length, containerWidth, view]);

  const activeKey = hoverKey ?? selectedKey;
  const active = points.find((point) => point.key === activeKey) ?? null;
  const activeIndex = points.findIndex((point) => point.key === activeKey);

  const saldoPoints = points.map((point, index) => ({ point, x: index * slot + slot / 2 })).filter((entry) => entry.point.saldo !== null);

  // Direct labels at the end of each line. When two would collide we drop one instead of nudging it away from its line.
  const endLabels = lines ? placeEndLabels(points, slot, y) : [];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {lines ? <LinesLegend /> : <Legend />}
        <div role="group" aria-label="Tipo de gráfico" className="flex gap-0.5 rounded-full bg-muted p-0.5">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === view}
              onClick={() => setView(option.id)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                option.id === view ? "bg-background font-medium shadow-sm" : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        <svg width={Y_AXIS_W} height={height} className="shrink-0 text-foreground-secondary" aria-hidden>
          {scale.ticks.map((tick) => (
            <text key={tick} x={Y_AXIS_W - 8} y={y(tick) + 3} textAnchor="end" className="fill-current text-[10px]">
              {formatAxisBRL(tick)}
            </text>
          ))}
        </svg>

        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
          <svg
            width={width}
            height={height}
            className="block text-foreground"
            role="group"
            aria-label={lines ? "Gráfico de linhas de entradas, saídas, poupado e saldo por mês" : "Gráfico mensal de entradas, débitos, cartão, poupado e saldo"}
          >
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
              const slotX = index * slot;
              const selected = point.key === selectedKey;
              return (
                <g key={point.key}>
                  {!lines && selected && <rect x={slotX + 2} y={TOP} width={slot - 4} height={plotH} rx={8} fill="currentColor" opacity={0.07} />}

                  {!lines &&
                    SERIES.map((series, seriesIndex) => {
                      const value = series.value(point);
                      if (value === null || value <= 0) return null;
                      const x = slotX + (slot - groupW) / 2 + seriesIndex * (barW + BAR_GAP);
                      return (
                        <path
                          key={series.id}
                          d={columnPath(x, y(value), barW, baseline)}
                          fill={point.projected ? `url(#hatch-${series.id})` : series.color}
                        />
                      );
                    })}

                  <text
                    x={slotX + slot / 2}
                    y={TOP + plotH + 16}
                    textAnchor="middle"
                    className={`text-[11px] ${selected ? "fill-foreground font-semibold" : "fill-foreground-secondary"}`}
                  >
                    {shortMonth(point.month)}
                  </text>
                  {(index === 0 || point.month === "Janeiro") && (
                    <text x={slotX + slot / 2} y={TOP + plotH + 30} textAnchor="middle" className="fill-foreground-secondary text-[10px]">
                      {point.year}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Bars view: the saldo line rides over the columns. */}
            {!lines &&
              saldoPoints.slice(1).map((entry, index) => {
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
            {!lines && saldoPoints.map(({ point, x }) => <Marker key={point.key} shape="circle" x={x} y={y(point.saldo!)} color="currentColor" hollow={point.projected} />)}

            {/* Lines view: crosshair on the active month, then every series. */}
            {lines && activeIndex >= 0 && (
              <line
                x1={activeIndex * slot + slot / 2}
                x2={activeIndex * slot + slot / 2}
                y1={TOP}
                y2={TOP + plotH}
                stroke="currentColor"
                strokeWidth={1}
                opacity={0.25}
              />
            )}
            {lines &&
              LINE_SERIES.map((series) => {
                const dots = points.map((point, index) => ({ point, index, value: series.value(point) }));
                return (
                  <g key={series.id}>
                    {dots.slice(1).map((dot, i) => {
                      const from = dots[i];
                      if (from.value === null || dot.value === null) return null;
                      return (
                        <line
                          key={dot.point.key}
                          x1={from.index * slot + slot / 2}
                          y1={y(from.value)}
                          x2={dot.index * slot + slot / 2}
                          y2={y(dot.value)}
                          stroke={series.color}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeDasharray={dot.point.projected ? "4 4" : undefined}
                        />
                      );
                    })}
                    {dots.map((dot) =>
                      dot.value === null ? null : (
                        <Marker key={dot.point.key} shape={series.shape} x={dot.index * slot + slot / 2} y={y(dot.value)} color={series.color} hollow={dot.point.projected} />
                      ),
                    )}
                  </g>
                );
              })}
            {endLabels.map((label) => (
              <text key={label.id} x={label.x} y={label.y + 3} className="fill-foreground-secondary text-[11px]">
                {label.text}
              </text>
            ))}

            {/* One hit target per month, much bigger than the marks. */}
            {points.map((point, index) => (
              <rect
                key={point.key}
                x={index * slot}
                y={0}
                width={slot}
                height={TOP + plotH + AXIS_H}
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

/** A point marker (>= 8px, 2px surface ring). Projected months get a hollow one. */
function Marker({ shape, x, y, color, hollow }: { shape: Shape; x: number; y: number; color: string; hollow?: boolean }) {
  const paint = { fill: hollow ? "var(--card)" : color, stroke: hollow ? color : "var(--card)", strokeWidth: 2 };
  if (shape === "square") return <rect x={x - 4} y={y - 4} width={8} height={8} rx={1.5} {...paint} />;
  if (shape === "diamond") return <polygon points={`${x},${y - 5.5} ${x + 5.5},${y} ${x},${y + 5.5} ${x - 5.5},${y}`} {...paint} />;
  return <circle cx={x} cy={y} r={4} {...paint} />;
}

interface EndLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

/** Labels at the last known point of each line; a label that would sit on top of another is skipped. */
function placeEndLabels(points: MonthPoint[], slot: number, y: (value: number) => number): EndLabel[] {
  const candidates = LINE_SERIES.flatMap((series): EndLabel[] => {
    for (let index = points.length - 1; index >= 0; index--) {
      const value = series.value(points[index]);
      if (value !== null) return [{ id: series.id, text: series.label, x: index * slot + slot / 2 + 10, y: y(value) }];
    }
    return [];
  }).sort((a, b) => a.y - b.y);

  const kept: EndLabel[] = [];
  for (const label of candidates) {
    if (kept.every((other) => Math.abs(other.y - label.y) >= 14 || Math.abs(other.x - label.x) >= 60)) kept.push(label);
  }
  return kept;
}

function LegendItems({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">{children}</ul>;
}

function ProjectedKey() {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-sm text-foreground-secondary"
        style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 5px)" }}
      />
      Projetado
    </li>
  );
}

function Legend() {
  return (
    <LegendItems>
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
      <ProjectedKey />
    </LegendItems>
  );
}

function LinesLegend() {
  return (
    <LegendItems>
      {LINE_SERIES.map((series) => (
        <li key={series.id} className="flex items-center gap-1.5">
          <svg width="18" height="12" aria-hidden>
            <line x1="0" y1="6" x2="18" y2="6" stroke={series.color} strokeWidth="2" strokeLinecap="round" />
            <Marker shape={series.shape} x={9} y={6} color={series.color} />
          </svg>
          {series.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg width="18" height="12" aria-hidden>
          <line x1="0" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        Projetado
      </li>
    </LegendItems>
  );
}

function Readout({ point }: { point: MonthPoint }) {
  const rows: { label: string; color?: string; value: number | null; strong?: boolean }[] = [
    { label: "Entradas", color: TABLE_HEADER_COLORS.entradas, value: point.entradas },
    { label: "Débitos", color: TABLE_HEADER_COLORS.debitos, value: point.debitos },
    { label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, value: point.cartao },
    { label: "Poupado", color: SAVINGS_COLOR, value: point.poupado },
    { label: "Saldo", value: point.saldo, strong: true },
  ];

  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="mb-1.5 text-xs font-medium text-foreground-secondary">
        {point.month} {point.year}
        {point.projected && " · projetado"}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-5">
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
