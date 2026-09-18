"use client";

import { formatBRLWhole } from "@/lib/analysis/format";
import type { MonthPoint } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";

const money = (value: number | null) => (value === null ? "—" : formatBRLWhole(value));

/** The chart's numbers as text: every value is reachable here without hovering anything. */
export function MonthTable({
  points,
  selectedKey,
  onSelect,
}: {
  points: MonthPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const columns = [
    { label: "Entradas", color: TABLE_HEADER_COLORS.entradas },
    { label: "Débitos", color: TABLE_HEADER_COLORS.debitos },
    { label: "Cartão", color: TABLE_HEADER_COLORS.nubank },
    { label: "Saldo", color: undefined },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[440px] text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-foreground-secondary">
            <th className="px-3 py-2 text-left font-medium">Mês</th>
            {columns.map((column) => (
              <th key={column.label} className="px-3 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {column.color && <span className="size-2 rounded-sm" style={{ backgroundColor: column.color }} />}
                  {column.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {points.map((point) => {
            const selected = point.key === selectedKey;
            return (
              <tr
                key={point.key}
                onClick={() => onSelect(point.key)}
                className={`cursor-pointer transition-colors hover:bg-accent/60 ${selected ? "bg-muted/60" : ""} ${point.projected ? "text-foreground-secondary" : ""}`}
              >
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <button type="button" onClick={() => onSelect(point.key)} aria-pressed={selected} className="text-left">
                    {point.month.slice(0, 3)}/{point.year.slice(2)}
                    {point.projected && <span className="ml-1.5 text-[10px] font-normal">proj.</span>}
                  </button>
                </th>
                <td className="px-3 py-2 text-right">{money(point.entradas)}</td>
                <td className="px-3 py-2 text-right">{money(point.debitos)}</td>
                <td className="px-3 py-2 text-right">{money(point.cartao)}</td>
                <td className="px-3 py-2 text-right font-semibold">{money(point.saldo)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
