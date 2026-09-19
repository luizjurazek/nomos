"use client";

import { formatBRL } from "@/lib/analysis/format";
import { committedView, type MonthPoint } from "@/lib/analysis/timeline";
import { TABLE_HEADER_COLORS } from "@/components/finance/table-colors";
import { SAVINGS_COLOR } from "./colors";

const money = (value: number | null) => (value === null ? "—" : formatBRL(value));

/** The chart's numbers as text: every value is reachable here without hovering anything. */
export function MonthTable({
  points,
  selectedKey,
  onSelect,
  onHover,
  embedded = false,
}: {
  points: MonthPoint[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** The month under the mouse (or with keyboard focus), null when it leaves: lets the summary compare against it. */
  onHover?: (key: string | null) => void;
  /** Drops the card frame and the scrolling when the table already sits inside a scrolling card. */
  embedded?: boolean;
}) {
  const columns = [
    { label: "Entradas", color: TABLE_HEADER_COLORS.entradas },
    { label: "Débitos", color: TABLE_HEADER_COLORS.debitos },
    { label: "Cartão", color: TABLE_HEADER_COLORS.nubank },
    { label: "Poupado", color: SAVINGS_COLOR },
    { label: "Saldo", color: undefined },
  ];

  return (
    <div className={embedded ? "" : "overflow-x-auto rounded-2xl border border-border bg-card"}>
      <table className="w-full min-w-[520px] text-xs tabular-nums">
        <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
          <tr className="text-foreground-secondary">
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
          {points.map((raw) => {
            // Months past the last tab list what is already contracted, in the place of the (unknown) real values.
            const point = committedView(raw);
            const selected = point.key === selectedKey;
            return (
              <tr
                key={point.key}
                onClick={() => onSelect(point.key)}
                onPointerEnter={(event) => event.pointerType === "mouse" && onHover?.(point.key)}
                onPointerLeave={() => onHover?.(null)}
                title={raw.committed ? "Só o que já está contratado: parcelas e fatura do cartão" : undefined}
                className={`cursor-pointer transition-colors hover:bg-accent/60 ${selected ? "bg-muted/60" : ""} ${point.projected ? "text-foreground-secondary" : ""}`}
              >
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => onSelect(point.key)}
                    onFocus={() => onHover?.(point.key)}
                    onBlur={() => onHover?.(null)}
                    aria-pressed={selected}
                    className="text-left"
                  >
                    {point.month.slice(0, 3)}/{point.year.slice(2)}
                    {point.projected && <span className="ml-1.5 text-[10px] font-normal">proj.</span>}
                  </button>
                </th>
                <td className="px-3 py-2 text-right">{money(point.entradas)}</td>
                <td className="px-3 py-2 text-right">{money(point.debitos)}</td>
                <td className="px-3 py-2 text-right">{money(point.cartao)}</td>
                <td className={`px-3 py-2 text-right ${point.poupado !== null && point.poupado < 0 ? "text-destructive" : ""}`}>{money(point.poupado)}</td>
                <td className="px-3 py-2 text-right font-semibold">{money(point.saldo)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
