import { formatBRLWhole } from "@/lib/analysis/format";
import type { PeriodSummary } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";

interface Tile {
  label: string;
  value: string;
  hint?: string;
  dot?: string;
}

/** Four numbers about the visible period. Months without a tab (card-only projections) are not part of them. */
export function SummaryCards({ summary }: { summary: PeriodSummary }) {
  const tiles: Tile[] = [
    { label: "Saldo do período", value: formatBRLWhole(summary.saldoTotal), hint: `${summary.months} ${summary.months === 1 ? "mês" : "meses"}` },
    {
      label: "Mês mais apertado",
      value: summary.tightest ? formatBRLWhole(summary.tightest.saldo ?? 0) : "—",
      hint: summary.tightest ? `${summary.tightest.month} ${summary.tightest.year}` : undefined,
    },
    { label: "Entradas por mês", value: formatBRLWhole(summary.avgEntradas), hint: "média", dot: TABLE_HEADER_COLORS.entradas },
    { label: "Saídas por mês", value: formatBRLWhole(summary.avgSaidas), hint: "média, com cartão", dot: TABLE_HEADER_COLORS.debitos },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass-surface flex flex-col gap-1 rounded-2xl border border-border px-4 py-3">
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
