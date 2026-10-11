import { formatBRL, formatPercent } from "@/lib/analysis/format";
import { committedView, viewPoint, type MonthPoint, type PeriodSummary, type SavingsOpening } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { SAVINGS_COLOR } from "./colors";
import { shortRefLabel } from "./labels";
import type { Scope } from "./filter-bar";

interface Tile {
  label: string;
  value: string;
  hint?: string;
  dot?: string;
  /** A negative poupado is shown in red. */
  negative?: boolean;
  /** Fixed set of figures under the value; always the same lines, so the tile keeps its height from month to month. */
  stats?: { label: string; value: string }[];
}

const money = (value: number | null) => (value === null ? "—" : formatBRL(value));

function savingsStats(aportes: number | null, retiradas: number | null, realIncome: number, net: number | null): NonNullable<Tile["stats"]> {
  return [
    { label: "Da renda", value: net === null || realIncome <= 0 ? "—" : formatPercent(net / realIncome) },
    { label: "Aportes", value: money(aportes) },
    { label: "Retiradas", value: money(retiradas) },
  ];
}

/** "Até ago/26" when months on record come before, "Saldo inicial" when only the savings from before the app do. */
const openingLabel = (opening: SavingsOpening) => (opening.through ? `Até ${shortRefLabel(opening.through)}` : "Saldo inicial");

/**
 * The savings headline is the running total at the end of the period (what was already saved before it plus what it
 * saved); the period's own share is the first line under it. "Da renda" stays about the period's own income.
 */
function periodTiles(summary: PeriodSummary, opening: SavingsOpening, last: MonthPoint): Tile[] {
  const poupadoTotal = opening.total + summary.poupadoTotal;
  const showOpening = opening.through !== null || opening.total !== 0;
  return [
    { label: "Saldo do período", value: formatBRL(summary.saldoTotal), hint: `${summary.months} ${summary.months === 1 ? "mês" : "meses"}` },
    { label: "Entradas por mês", value: formatBRL(summary.avgEntradas), hint: "média", dot: TABLE_HEADER_COLORS.entradas },
    {
      label: "Saídas por mês",
      value: formatBRL(summary.avgSaidas),
      hint: "média, com cartão",
      dot: TABLE_HEADER_COLORS.debitos,
      stats: [
        { label: "Sem o cartão", value: formatBRL(summary.avgDebitos) },
        { label: "Cartão", value: formatBRL(summary.avgCartao) },
      ],
    },
    {
      label: `Poupado até ${shortRefLabel(last)}`,
      value: formatBRL(poupadoTotal),
      dot: SAVINGS_COLOR,
      negative: poupadoTotal < 0,
      stats: [
        // No month with a tab in the period (only contracted installments): nothing known was saved in it.
        { label: "No período", value: money(summary.months > 0 ? summary.poupadoTotal : null) },
        ...savingsStats(summary.aportesTotal, summary.retiradasTotal, summary.realIncome, summary.poupadoTotal),
        ...(showOpening ? [{ label: openingLabel(opening), value: money(opening.total) }] : []),
      ],
    },
  ];
}

/** `raw` is the month as the sheet has it; what is shown follows the page-wide savings switch (see `viewPoint`). */
function monthTiles(raw: MonthPoint, withSavings: boolean, opening: SavingsOpening): Tile[] {
  const committed = raw.committed !== null;
  const point = viewPoint(committedView(raw), withSavings);
  const saidas = point.debitos === null ? null : point.debitos + point.cartao;
  const realIncome = (raw.entradas ?? 0) - (raw.retiradas ?? 0);
  const state = committed ? "só parcelas" : point.projected ? "previsto" : "do mês";
  return [
    { label: committed ? "Comprometido" : "Saldo do mês", value: money(point.saldo), hint: `${shortRefLabel(point)} · ${state}` },
    { label: "Entradas", value: money(point.entradas), hint: state, dot: TABLE_HEADER_COLORS.entradas },
    {
      label: "Saídas",
      value: money(saidas),
      hint: "com cartão",
      dot: TABLE_HEADER_COLORS.debitos,
      stats: [
        { label: "Sem o cartão", value: money(point.debitos) },
        { label: "Cartão", value: money(point.cartao) },
      ],
    },
    {
      label: "Poupado no mês",
      value: money(point.poupado),
      dot: SAVINGS_COLOR,
      negative: point.poupado !== null && point.poupado < 0,
      stats: [
        ...savingsStats(point.aportes, point.retiradas, realIncome, point.poupado),
        { label: `Total até ${shortRefLabel(point)}`, value: formatBRL(opening.total + (point.poupado ?? 0)) },
      ],
    },
  ];
}

/** Four numbers about the visible period or the selected month, two by two. Card-only projections don't count in the period. */
export function SummaryCards({
  scope,
  summary,
  point,
  withSavings,
  opening,
  last,
}: {
  scope: Scope;
  summary: PeriodSummary;
  point: MonthPoint | null;
  withSavings: boolean;
  /** What was already saved when the selected month (or else the period) starts: see `savingsBefore`. */
  opening: SavingsOpening;
  /** Last month of the period, which the savings total runs up to. */
  last: MonthPoint;
}) {
  const tiles = scope === "month" && point ? monthTiles(point, withSavings, opening) : periodTiles(summary, opening, last);

  // Grid items stretch to the tallest of their row, so a taller tile lifts its neighbour instead of leaving it short.
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass-surface flex flex-col gap-1 rounded-2xl border border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {tile.dot && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tile.dot }} />}
            <p className="break-words text-xs text-foreground-secondary">{tile.label}</p>
          </div>
          <p className={`text-lg font-semibold tracking-tight tabular-nums ${tile.negative ? "text-destructive" : ""}`}>{tile.value}</p>
          {tile.hint && <p className="text-[11px] text-foreground-secondary">{tile.hint}</p>}
          {tile.stats && (
            <dl className="flex flex-col gap-0.5 text-[11px]">
              {tile.stats.map((stat) => (
                <div key={stat.label} className="flex justify-between gap-2 whitespace-nowrap">
                  <dt className="text-foreground-secondary">{stat.label}</dt>
                  <dd className="font-medium tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}
