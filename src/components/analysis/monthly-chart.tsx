"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatAxisBRL, formatBRL } from "@/lib/analysis/format";
import { shortMonth } from "@/lib/analysis/months";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { DeltaText, type Better } from "./delta-text";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { columnPath, niceScale } from "./chart-utils";
import { SAVINGS_COLOR } from "./colors";
import { MonthTable } from "./month-table";
import { useContainerWidth } from "./use-container-width";

/** Slot width per month: at least this, growing so the chart fills the whole card. */
const MIN_SLOT = 76;
const MIN_SLOT_LINES = 56;
/** Room to the right of the last month for the direct labels of the line view. */
const END_LABEL_PAD = 76;
const MIN_BAR_W = 14;
/** Bars never get thicker than the mark spec allows. */
const MAX_BAR_W = 24;
const BAR_GAP = 2;
const TOP = 24;
/** Narrower than this, the "Projeção" label doesn't fit in its band and is left out. */
const MIN_LABEL_W = 70;
const AXIS_H = 38;
const Y_AXIS_W = 56;

interface Series {
  id: "entradas" | "debitos" | "cartao" | "poupado";
  label: string;
  color: string;
  /** Which direction of change is good news, for tinting the comparisons. */
  better: Better;
  value: (point: MonthPoint) => number | null;
  /** What is inside the value that the bare number doesn't say (e.g. savings counted as débitos). */
  note?: (point: MonthPoint, withSavings: boolean) => string | null;
}

/** The savings transfers are booked as débitos, and the reserve withdrawals as entradas: say so where the numbers are. */
const includesSaved = (point: MonthPoint, withSavings: boolean) => {
  if (!point.aportes) return null;
  return withSavings ? `inclui ${formatBRL(point.aportes)} guardados` : `sem ${formatBRL(point.aportes)} guardados`;
};
const includesWithdrawn = (point: MonthPoint, withSavings: boolean) => {
  if (!point.retiradas) return null;
  return withSavings ? `inclui ${formatBRL(point.retiradas)} da reserva` : `sem ${formatBRL(point.retiradas)} da reserva`;
};
const savedBreakdown = (where: string) => (point: MonthPoint, withSavings: boolean) => {
  if (point.aportes === null) return null;
  if (point.retiradas) return `${formatBRL(point.aportes)} guardados − ${formatBRL(point.retiradas)} da reserva`;
  return withSavings ? `já contado nos ${where}` : `fora dos ${where}`;
};
const balanceNote = (spending: string) => (point: MonthPoint, withSavings: boolean) => {
  if (point.saldo === null) return null;
  return withSavings ? `entradas − ${spending}` : `entradas − ${spending} − poupado`;
};

const SERIES: Series[] = [
  { id: "entradas", label: "Entradas", color: TABLE_HEADER_COLORS.entradas, better: "up", note: includesWithdrawn, value: (point) => point.entradas },
  { id: "debitos", label: "Débitos", color: TABLE_HEADER_COLORS.debitos, better: "down", note: includesSaved, value: (point) => point.debitos },
  { id: "cartao", label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, better: "down", value: (point) => point.cartao },
  { id: "poupado", label: "Poupado", color: SAVINGS_COLOR, better: "up", note: savedBreakdown("débitos"), value: (point) => point.poupado },
];

type View = "bars" | "lines" | "table";

interface LineSeries {
  id: "entradas" | "saidas" | "cartao" | "poupado" | "saldo";
  label: string;
  color: string;
  better: Better;
  note?: (point: MonthPoint, withSavings: boolean) => string | null;
  value: (point: MonthPoint) => number | null;
}

const LINE_SERIES: LineSeries[] = [
  { id: "entradas", label: "Entradas", color: TABLE_HEADER_COLORS.entradas, better: "up", note: includesWithdrawn, value: (point) => point.entradas },
  // Only known when the month has a tab: past the last tab we just don't know the débitos.
  { id: "saidas", label: "Saídas", color: TABLE_HEADER_COLORS.debitos, better: "down", note: includesSaved, value: (point) => (point.debitos === null ? null : point.debitos + point.cartao) },
  // Already counted inside Saídas; kept as its own line to follow the card bill on its own.
  { id: "cartao", label: "Cartão (fatura)", color: TABLE_HEADER_COLORS.nubank, better: "down", value: (point) => point.cartao },
  { id: "poupado", label: "Poupado", color: SAVINGS_COLOR, better: "up", note: savedBreakdown("saídas"), value: (point) => point.poupado },
  { id: "saldo", label: "Saldo", color: "var(--foreground)", better: "up", note: balanceNote("saídas"), value: (point) => point.saldo },
];

/** Series ids that can be toggled from the legend; "saldo" is shared by both views. */
type SeriesId = Series["id"] | LineSeries["id"];

const BAR_IDS: SeriesId[] = [...SERIES.map((series) => series.id), "saldo"];
const LINE_IDS: SeriesId[] = LINE_SERIES.map((series) => series.id);

type Metric = Pick<Series, "label" | "color" | "better" | "value" | "note">;

/** A negative poupado means more came out of the reserve than went in: shown in red wherever it appears. */
const isDrawdown = (metric: Metric, value: number | null) => metric.label === "Poupado" && value !== null && value < 0;

const SALDO: Metric = { label: "Saldo", color: "var(--foreground)", better: "up", note: balanceNote("débitos − cartão"), value: (point) => point.saldo };

const TIP_WIDTH = 300;

/** What the legend starts with in either view: every series except the balance, which is opt-in. */
const DEFAULT_SERIES: ReadonlySet<SeriesId> = new Set([...BAR_IDS, ...LINE_IDS].filter((id) => id !== "saldo"));

const VIEWS: { id: View; label: string }[] = [
  { id: "bars", label: "Barras" },
  { id: "lines", label: "Linhas" },
  { id: "table", label: "Tabela" },
];

interface MonthlyChartProps {
  points: MonthPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Whether `points` carry the savings money in entradas/débitos (see `viewPoint`); the page-wide switch. */
  withSavings: boolean;
}

export function MonthlyChart({ points, selectedKey, onSelect, withSavings }: MonthlyChartProps) {
  const [view, setView] = useState<View>("table");
  // Mouse/keyboard hover: the month plus the x (relative to the chart box) where its tooltip is anchored.
  const [hover, setHover] = useState<{ key: string; x: number } | null>(null);
  const hoverKey = hover?.key ?? null;
  // Month pinned as the comparison target; touch screens have no hover, so it is picked with a tap.
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [scrollRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<ReadonlySet<SeriesId>>(DEFAULT_SERIES);
  const lines = view === "lines";
  const table = view === "table";
  const spendingLabel = lines ? "saídas" : "débitos";
  const cap = (text: string) => text[0].toUpperCase() + text.slice(1);

  const isVisible = (id: SeriesId) => selected.has(id);
  const hidden: ReadonlySet<SeriesId> = new Set((lines ? LINE_IDS : BAR_IDS).filter((id) => !isVisible(id)));
  const visibleSeries = SERIES.filter((series) => isVisible(series.id));
  const visibleLines = LINE_SERIES.filter((series) => isVisible(series.id));
  const showSaldo = isVisible("saldo");

  // Emptying the selection goes back to the default, so the chart never goes blank.
  const toggleSeries = (id: SeriesId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const ids = lines ? LINE_IDS : BAR_IDS;
    setSelected(ids.some((other) => next.has(other)) ? next : DEFAULT_SERIES);
  };

  // Bar and line views have different series, so a selection doesn't carry over.
  const changeView = (next: View) => {
    setView(next);
    setSelected(DEFAULT_SERIES);
    setPicking(false);
  };

  // Slots grow to fill the card; the line view keeps room on the right for the end labels.
  const pad = lines ? END_LABEL_PAD : 0;
  const minSlot = lines ? MIN_SLOT_LINES : MIN_SLOT;
  const slot = Math.max(minSlot, Math.floor((containerWidth - pad) / Math.max(points.length, 1)));
  const barW = Math.min(MAX_BAR_W, Math.max(MIN_BAR_W, Math.round(slot * 0.2)));
  const groupW = visibleSeries.length * barW + Math.max(0, visibleSeries.length - 1) * BAR_GAP;
  const plotH = containerWidth >= 640 ? 260 : 200;
  const height = TOP + plotH + AXIS_H;

  const scale = useMemo(() => {
    const values = lines
      ? points.flatMap((point) => visibleLines.map((series) => series.value(point)))
      : points.flatMap((point) => [...visibleSeries.map((series) => series.value(point)), showSaldo ? point.saldo : null]);
    const known = values.filter((value): value is number => value !== null);
    return niceScale(Math.min(0, ...known), Math.max(0, ...known));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, lines, selected]);

  const y = (value: number) => TOP + ((scale.hi - value) / (scale.hi - scale.lo)) * plotH;
  const baseline = y(0);
  // Everything from the first projected month onwards is shaded as one band.
  const projectionStart = points.findIndex((point) => point.projected);
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
  const activeIndex = points.findIndex((point) => point.key === activeKey);

  // The summary stays on the chosen month; hovering (or pinning) another month compares against it.
  const hovered = points.find((point) => point.key === hoverKey) ?? null;
  const base = points.find((point) => point.key === selectedKey) ?? hovered;
  const pinned = points.find((point) => point.key === pinnedKey) ?? null;
  const compareTo = [hovered, pinned].find((point) => point && point.key !== base?.key) ?? null;

  const showHover = (event: React.SyntheticEvent<SVGRectElement>, key: string) => {
    const box = chartRef.current?.getBoundingClientRect();
    if (!box) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - box.left;
    setHover({ key, x: Math.min(Y_AXIS_W + containerWidth, Math.max(Y_AXIS_W, x)) });
  };

  const choose = (key: string) => {
    if (picking) {
      setPinnedKey(key === selectedKey ? null : key);
      setPicking(false);
    } else {
      onSelect(key);
    }
  };

  // What the hover tooltip lists: the series currently on the chart.
  const tipMetrics: Metric[] = lines ? visibleLines : [...visibleSeries, ...(showSaldo ? [SALDO] : [])];

  const saldoPoints = (showSaldo ? points : []).map((point, index) => ({ point, x: index * slot + slot / 2 })).filter((entry) => entry.point.saldo !== null);

  // Direct labels at the end of each line. When two would collide we drop one instead of nudging it away from its line.
  const endLabels = lines ? placeEndLabels(visibleLines, points, slot, y) : [];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] text-foreground-secondary">
        {withSavings
          ? `Como na planilha: o que você guarda (Investimentos e Reserva) é lançado como débito e o que volta da reserva entra como entrada. Por isso as Entradas e os ${cap(spendingLabel)} carregam dinheiro de poupança, e o Poupado (guardado − retirado) já está dentro deles.`
          : `Entradas e ${cap(spendingLabel)} mostram só o dia a dia, sem o que foi guardado nem o que voltou da reserva. O Poupado (guardado − retirado) aparece à parte, e o Saldo é o mesmo: entradas − ${lines ? "saídas" : "débitos − cartão"} − poupado.`}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {/* Invisible (not removed) in the table view, so the header row keeps its height. */}
        <div className={table ? "invisible" : ""}>
          {lines ? <LinesLegend hidden={hidden} onToggle={toggleSeries} /> : <Legend hidden={hidden} onToggle={toggleSeries} />}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div role="group" aria-label="Tipo de visualização" className="flex gap-0.5 rounded-full bg-muted p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === view}
                onClick={() => changeView(option.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  option.id === view ? "bg-background font-medium shadow-sm" : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The chart keeps its space (only invisible) in the table view, so the card never changes height and the width observer stays attached. */}
      <div ref={chartRef} className={`relative flex ${table ? "invisible" : ""}`}>
        {table && (
          <div className="visible absolute inset-0 z-10 overflow-auto rounded-xl bg-card">
            <MonthTable points={points} selectedKey={selectedKey} onSelect={choose} onHover={(key) => setHover(key ? { key, x: 0 } : null)} embedded />
          </div>
        )}
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
            aria-label={lines ? "Gráfico de linhas de entradas, saídas, cartão, poupado e saldo por mês" : "Gráfico mensal de entradas, débitos, cartão, poupado e saldo"}
          >
            {scale.ticks.map((tick) => (
              <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={tick === 0 ? 1.5 : 1} />
            ))}

            {projectionStart >= 0 && (
              <g>
                <rect x={projectionStart * slot} y={TOP} width={(points.length - projectionStart) * slot} height={plotH} fill="currentColor" opacity={0.06} />
                {(points.length - projectionStart) * slot >= MIN_LABEL_W && (
                  <text x={projectionStart * slot + 6} y={TOP - 6} className="fill-foreground-secondary text-[10px] font-medium">
                    Projeção →
                  </text>
                )}
              </g>
            )}

            {points.map((point, index) => {
              const slotX = index * slot;
              const selected = point.key === selectedKey;
              return (
                <g key={point.key}>
                  {!lines && selected && <rect x={slotX + 2} y={TOP} width={slot - 4} height={plotH} rx={8} fill="currentColor" opacity={0.07} />}

                  {!lines &&
                    visibleSeries.map((series, seriesIndex) => {
                      const value = series.value(point);
                      // Negative values (poupado when more left the reserve than went in) grow below the zero line.
                      if (value === null || value === 0) return null;
                      const x = slotX + (slot - groupW) / 2 + seriesIndex * (barW + BAR_GAP);
                      return (
                        <path key={series.id} d={columnPath(x, y(value), barW, baseline)} fill={series.color} />
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
                  />
                );
              })}
            {!lines && saldoPoints.map(({ point, x }) => <Marker key={point.key} x={x} y={y(point.saldo!)} color="currentColor" />)}

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
              visibleLines.map((series) => {
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
                        />
                      );
                    })}
                    {dots.map((dot) =>
                      dot.value === null ? null : (
                        <Marker key={dot.point.key} x={dot.index * slot + slot / 2} y={y(dot.value)} color={series.color} active={dot.index === activeIndex} />
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
                aria-label={`${point.month} ${point.year}: saldo ${point.saldo === null ? "desconhecido" : formatBRL(point.saldo)}`}
                onClick={() => choose(point.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(point.key);
                  }
                }}
                onPointerEnter={(event) => event.pointerType === "mouse" && showHover(event, point.key)}
                onPointerLeave={() => setHover(null)}
                onFocus={(event) => showHover(event, point.key)}
                onBlur={() => setHover(null)}
              />
            ))}
          </svg>
        </div>

        {!table && hover && hovered && (
          <HoverTip
            point={hovered}
            prev={points[points.indexOf(hovered) - 1] ?? null}
            next={points[points.indexOf(hovered) + 1] ?? null}
            metrics={tipMetrics}
            withSavings={withSavings}
            x={hover.x}
            limit={Y_AXIS_W + containerWidth}
            gap={slot / 2 + 8}
          />
        )}
      </div>

      {base && (
        <Readout
          point={base}
          prev={points[points.indexOf(base) - 1] ?? null}
          next={points[points.indexOf(base) + 1] ?? null}
          compareTo={compareTo}
          withSavings={withSavings}
          pinned={pinned}
          picking={picking}
          target={table ? "da tabela" : "do gráfico"}
          onTogglePicking={() => setPicking((value) => !value)}
          onClearPinned={() => setPinnedKey(null)}
        />
      )}
    </div>
  );
}

/** A point marker (>= 8px, 2px surface ring); a bit larger on the active month. */
function Marker({ x, y, color, active }: { x: number; y: number; color: string; active?: boolean }) {
  return <circle cx={x} cy={y} r={active ? 5 : 4} fill={color} stroke="var(--card)" strokeWidth={2} />;
}

interface EndLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

/** Labels at the last known point of each line; a label that would sit on top of another is skipped. */
function placeEndLabels(series: LineSeries[], points: MonthPoint[], slot: number, y: (value: number) => number): EndLabel[] {
  const candidates = series.flatMap((item): EndLabel[] => {
    for (let index = points.length - 1; index >= 0; index--) {
      const value = item.value(points[index]);
      if (value !== null) return [{ id: item.id, text: item.label, x: index * slot + slot / 2 + 10, y: y(value) }];
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
  return <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground-secondary">{children}</ul>;
}

interface LegendProps {
  hidden: ReadonlySet<SeriesId>;
  onToggle: (id: SeriesId) => void;
}

/** A legend entry that doubles as the on/off switch of its series. */
function LegendToggle({ id, label, hidden, onToggle, children }: LegendProps & { id: SeriesId; label: string; children: React.ReactNode }) {
  const off = hidden.has(id);
  return (
    <li>
      <button
        type="button"
        aria-pressed={!off}
        aria-label={`${off ? "Adicionar" : "Remover"} ${label} do gráfico`}
        onClick={() => onToggle(id)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          off ? "border-transparent text-foreground-secondary line-through opacity-60 hover:opacity-100" : "border-border bg-muted/50 text-foreground"
        }`}
      >
        {children}
        {label}
      </button>
    </li>
  );
}

function Legend({ hidden, onToggle }: LegendProps) {
  return (
    <LegendItems>
      {SERIES.map((series) => (
        <LegendToggle key={series.id} id={series.id} label={series.label} hidden={hidden} onToggle={onToggle}>
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
        </LegendToggle>
      ))}
      <LegendToggle id="saldo" label="Saldo" hidden={hidden} onToggle={onToggle}>
        <svg width="16" height="10" className="text-foreground" aria-hidden>
          <line x1="0" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="8" cy="5" r="3.5" fill="currentColor" stroke="var(--card)" strokeWidth="1.5" />
        </svg>
      </LegendToggle>
    </LegendItems>
  );
}

function LinesLegend({ hidden, onToggle }: LegendProps) {
  return (
    <LegendItems>
      {LINE_SERIES.map((series) => (
        <LegendToggle key={series.id} id={series.id} label={series.label} hidden={hidden} onToggle={onToggle}>
          <svg width="18" height="12" aria-hidden>
            <line x1="0" y1="6" x2="18" y2="6" stroke={series.color} strokeWidth="2" strokeLinecap="round" />
            <Marker x={9} y={6} color={series.color} />
          </svg>
        </LegendToggle>
      ))}
    </LegendItems>
  );
}

const READOUT_METRICS: Metric[] = [
  ...SERIES,
  SALDO,
];

/** Floating card next to the hovered month: each series' value plus its change from the months before and after. */
function HoverTip({
  point,
  prev,
  next,
  metrics,
  withSavings,
  x,
  limit,
  gap,
}: {
  point: MonthPoint;
  prev: MonthPoint | null;
  next: MonthPoint | null;
  metrics: Metric[];
  withSavings: boolean;
  x: number;
  limit: number;
  gap: number;
}) {
  // Sits to the right of the month, flipping to the left when it would run past the chart (never wider than the chart).
  const width = Math.min(TIP_WIDTH, limit);
  const flip = x + gap + width > limit;
  const left = flip ? Math.max(0, x - gap - width) : x + gap;
  return (
    <div
      role="tooltip"
      style={{ left, width }}
      className="pointer-events-none absolute top-2 z-10 rounded-xl border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-md"
    >
      <p className="mb-2 text-sm font-semibold">
        {point.month} {point.year}
        {point.projected && <span className="ml-1.5 text-xs font-normal text-foreground-secondary">projetado</span>}
      </p>
      {/* One block per series, a rule between them: value and note on top, then the change against each neighbouring month. */}
      <dl className="flex flex-col divide-y divide-border border-t border-border">
        {metrics.map((metric) => {
          const value = metric.value(point);
          const note = metric.note?.(point, withSavings);
          const comparisons = [prev, next].filter((other): other is MonthPoint => other !== null);
          return (
            <div key={metric.label} className="flex flex-col gap-1 py-2 last:pb-0">
              <dt className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: metric.color }} />
                  <span className="break-words">{metric.label}</span>
                </span>
                <span className={`font-semibold tabular-nums ${isDrawdown(metric, value) ? "text-destructive" : "text-foreground"}`}>
                  {value === null ? "—" : formatBRL(value)}
                </span>
              </dt>
              {note && <dd className="pl-4.5 text-[11px] text-foreground-secondary italic">{note}</dd>}
              {comparisons.map((other) => (
                <dd key={other.key} className="flex justify-between gap-3 pl-4.5 text-[11px] tabular-nums text-foreground-secondary">
                  <span>vs {shortMonth(other.month)}</span>
                  <DeltaText current={value} reference={metric.value(other)} better={metric.better} />
                </dd>
              ))}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

interface ReadoutProps {
  point: MonthPoint;
  prev: MonthPoint | null;
  next: MonthPoint | null;
  /** A month the user hovered or pinned; replaces the previous/next comparison. */
  compareTo: MonthPoint | null;
  withSavings: boolean;
  pinned: MonthPoint | null;
  picking: boolean;
  /** Where the month to compare is tapped, for the prompt while picking. */
  target: string;
  onTogglePicking: () => void;
  onClearPinned: () => void;
}

function Readout({ point, prev, next, compareTo, withSavings, pinned, picking, target, onTogglePicking, onClearPinned }: ReadoutProps) {
  const neighbours = [prev, next].filter((month): month is MonthPoint => month !== null);
  const comparisons = compareTo ? [compareTo] : neighbours;

  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium text-foreground-secondary">
          {point.month} {point.year}
          {point.projected && " · projetado"}
        </p>
        <div className="flex items-center gap-1.5">
          {pinned && !picking && (
            <button
              type="button"
              onClick={onClearPinned}
              aria-label={`Remover comparação com ${pinned.month} ${pinned.year}`}
              className="flex min-h-8 items-center gap-1 rounded-full bg-background px-2.5 text-xs shadow-sm"
            >
              vs {shortMonth(pinned.month)}/{pinned.year.slice(2)}
              <X className="size-3" aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-pressed={picking}
            onClick={onTogglePicking}
            className={`min-h-8 rounded-full px-2.5 text-xs transition-colors ${
              picking ? "bg-foreground text-background" : "bg-background shadow-sm hover:bg-accent/60"
            }`}
          >
            {picking ? `Toque em um mês ${target}` : "Comparar com outro mês"}
          </button>
        </div>
      </div>
      <p className="mb-2 text-[11px] text-foreground-secondary">
        {compareTo
          ? `Variação em relação a ${compareTo.month} ${compareTo.year}`
          : "Variação em relação ao mês anterior e ao posterior"}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-5">
        {READOUT_METRICS.map((metric) => {
          const value = metric.value(point);
          const note = metric.note?.(point, withSavings);
          return (
            <div key={metric.label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] text-foreground-secondary">
                {metric.label !== SALDO.label ? (
                  <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: metric.color }} />
                ) : (
                  <span className="h-0.5 w-2 shrink-0 bg-foreground" />
                )}
                <span className="break-words">{metric.label}</span>
              </dt>
              <dd
                className={`text-sm tabular-nums ${metric.label === SALDO.label ? "font-semibold" : "font-medium"} ${isDrawdown(metric, value) ? "text-destructive" : ""}`}
              >
                {value === null ? "—" : formatBRL(value)}
              </dd>
              {comparisons.map((other) => (
                <dd key={other.key} className="flex justify-between gap-2 text-[11px] tabular-nums text-foreground-secondary">
                  <span>{other === compareTo ? "" : `vs ${shortMonth(other.month)}`}</span>
                  <DeltaText current={value} reference={metric.value(other)} better={metric.better} />
                </dd>
              ))}
              {note && <dd className="text-[11px] italic text-foreground-secondary">{note}</dd>}
            </div>
          );
        })}
      </dl>
      {point.source === "installments" && (
        <p className="mt-2 text-[11px] text-foreground-secondary">
          {point.committed
            ? `Mês sem aba: só o que já está contratado (parcelas de entradas e débitos, e a fatura do cartão). Comprometido: ${formatBRL(point.committed.saldo)}.`
            : "Mês sem aba: só a fatura do cartão é conhecida (compras do último mês e parcelas já contratadas)."}
        </p>
      )}
    </div>
  );
}
