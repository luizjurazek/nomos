import { formatBRLWhole, formatPercent } from "@/lib/analysis/format";
import type { MonthPoint, PeriodSummary } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { SAVINGS_COLOR } from "./colors";
import { refLabel } from "./labels";
import type { Scope } from "./scope-switch";

interface Tile {
  label: string;
  value: string;
  hint?: string;
  dot?: string;
  /** Spans both columns on phones so an odd number of tiles doesn't leave a hole. */
  wide?: boolean;
}

const money = (value: number | null) => (value === null ? "—" : formatBRLWhole(value));

function savingsHint(aportes: number, retiradas: number, realIncome: number, net: number, fallback: string): string {
  const rate = realIncome > 0 ? `${formatPercent(net / realIncome)} da renda` : null;
  if (retiradas > 0) {
    const parts = `aportes ${formatBRLWhole(aportes)} − retiradas ${formatBRLWhole(retiradas)}`;
    return rate ? `${rate} · ${parts}` : parts;
  }
  return rate ?? fallback;
}

function periodTiles(summary: PeriodSummary): Tile[] {
  return [
    { label: "Saldo do período", value: formatBRLWhole(summary.saldoTotal), hint: `${summary.months} ${summary.months === 1 ? "mês" : "meses"}` },
    {
      label: "Mês mais apertado",
      value: summary.tightest ? formatBRLWhole(summary.tightest.saldo ?? 0) : "—",
      hint: summary.tightest ? `${summary.tightest.month} ${summary.tightest.year}` : undefined,
    },
    { label: "Entradas por mês", value: formatBRLWhole(summary.avgEntradas), hint: "média", dot: TABLE_HEADER_COLORS.entradas },
    { label: "Saídas por mês", value: formatBRLWhole(summary.avgSaidas), hint: "média, com cartão", dot: TABLE_HEADER_COLORS.debitos },
    {
      label: "Poupado no período",
      value: formatBRLWhole(summary.poupadoTotal),
      hint: savingsHint(summary.aportesTotal, summary.retiradasTotal, summary.realIncome, summary.poupadoTotal, "aportes previstos"),
      dot: SAVINGS_COLOR,
      wide: true,
    },
  ];
}

function monthTiles(point: MonthPoint): Tile[] {
  const saidas = point.debitos === null ? null : point.debitos + point.cartao;
  const realIncome = (point.entradas ?? 0) - (point.retiradas ?? 0);
  const state = point.projected ? "previsto" : "do mês";
  return [
    { label: "Saldo do mês", value: money(point.saldo), hint: `${refLabel(point)} · ${state}` },
    { label: "Entradas", value: money(point.entradas), hint: state, dot: TABLE_HEADER_COLORS.entradas },
    { label: "Saídas", value: money(saidas), hint: "débitos + fatura do cartão", dot: TABLE_HEADER_COLORS.debitos },
    { label: "Fatura do cartão", value: money(point.cartao), hint: "paga neste mês", dot: TABLE_HEADER_COLORS.nubank },
    {
      label: "Poupado no mês",
      value: money(point.poupado),
      hint:
        point.poupado === null
          ? undefined
          : savingsHint(point.aportes ?? 0, point.retiradas ?? 0, realIncome, point.poupado, "aportes previstos"),
      dot: SAVINGS_COLOR,
      wide: true,
    },
  ];
}

/** Five numbers about the visible period, or about the selected month. Card-only projections don't count in the period. */
export function SummaryCards({ scope, summary, point }: { scope: Scope; summary: PeriodSummary; point: MonthPoint | null }) {
  const tiles = scope === "month" && point ? monthTiles(point) : periodTiles(summary);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
      {tiles.map((tile) => (
        <div key={tile.label} className={`glass-surface flex flex-col gap-1 rounded-2xl border border-border px-4 py-3 ${tile.wide ? "col-span-2 lg:col-span-1" : ""}`}>
          <div className="flex items-center gap-2">
            {tile.dot && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tile.dot }} />}
            <p className="truncate text-xs text-foreground-secondary">{tile.label}</p>
          </div>
          <p className="text-lg font-semibold tracking-tight tabular-nums">{tile.value}</p>
          {tile.hint && <p className="text-[11px] text-foreground-secondary">{tile.hint}</p>}
        </div>
      ))}
    </div>
  );
}
