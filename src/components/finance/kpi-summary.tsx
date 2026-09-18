import { formatCurrency } from "@/lib/format/currency";
import type { MonthKpis } from "@/lib/sheets/types";

interface Tile {
  label: string;
  value: number;
  /** Matches the colored KPI cells in the original sheet (Recebido=blue, Pago=red, Saldo=dark). */
  color?: string;
}

export function KpiSummary({ kpis }: { kpis: MonthKpis }) {
  const tiles: Tile[] = [
    { label: "Recebido", value: kpis.recebido, color: "#4a86e8" },
    { label: "A receber", value: kpis.aReceber },
    { label: "Pago", value: kpis.pago, color: "#e01f1f" },
    { label: "A pagar", value: kpis.aPagar },
    { label: "Saldo atual", value: kpis.saldoAtual, color: "#1c1c1e" },
    { label: "Saldo final", value: kpis.saldoFinal, color: "#1c1c1e" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={
            tile.color
              ? "flex w-36 shrink-0 flex-col gap-1 rounded-2xl px-4 py-3 text-white lg:w-auto"
              : "glass-surface flex w-36 shrink-0 flex-col gap-1 rounded-2xl border border-border px-4 py-3 lg:w-auto"
          }
          style={tile.color ? { backgroundColor: tile.color } : undefined}
        >
          <p className={tile.color ? "text-xs text-white/75" : "text-xs text-foreground-secondary"}>{tile.label}</p>
          <p className="text-base font-semibold tabular-nums">{formatCurrency(tile.value)}</p>
        </div>
      ))}
    </div>
  );
}
