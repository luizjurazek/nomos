"use client";

import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/format/currency";
import { UNKNOWN_DAY_KEY, dayKey, daysFromToday } from "@/lib/format/dayGroups";
import type { DebitoRow } from "@/lib/sheets/types";
import { useToday } from "./use-today";

/** Unpaid bills due within this many days (or already overdue) show up in the card. */
const HORIZON_DAYS = 7;
const VISIBLE_ROWS = 3;

function dueLabel(diff: number): string {
  if (diff < 0) return `Atrasada há ${-diff} ${-diff === 1 ? "dia" : "dias"}`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

/** Heads-up on the month screen for unpaid Débitos that are overdue or due soon. Only looks at the current calendar month. */
export function UpcomingBillsCard({ debitos, onSelect }: { debitos: DebitoRow[]; onSelect: () => void }) {
  const today = useToday();

  const bills = useMemo(() => {
    if (!today) return [];
    return debitos
      .filter((row) => !row.pago)
      .flatMap((row) => {
        const key = dayKey(row.date);
        if (key === UNKNOWN_DAY_KEY || key.slice(0, 7) !== today.slice(0, 7)) return [];
        const diff = daysFromToday(key, today);
        return diff <= HORIZON_DAYS ? [{ row, diff }] : [];
      })
      .sort((a, b) => a.diff - b.diff);
  }, [debitos, today]);

  if (bills.length === 0) return null;

  const total = bills.reduce((acc, bill) => acc + bill.row.valor, 0);
  const hasOverdue = bills.some((bill) => bill.diff < 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="glass-surface flex w-full flex-col gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-accent/60"
    >
      <div className="flex items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${hasOverdue ? "bg-destructive" : "bg-warning"}`} />
        <span className="flex-1 text-sm font-medium">Contas a vencer</span>
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
        <ChevronRight className="size-4 shrink-0 text-foreground-secondary" />
      </div>
      <ul className="flex flex-col gap-2">
        {bills.slice(0, VISIBLE_ROWS).map(({ row, diff }) => (
          <li key={row.rowIndex} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm">{row.name}</p>
              <p className={`text-xs ${diff < 0 ? "text-destructive" : "text-foreground-secondary"}`}>
                {dueLabel(diff)}
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums">{formatCurrency(row.valor)}</span>
          </li>
        ))}
      </ul>
      {bills.length > VISIBLE_ROWS && (
        <p className="text-xs text-foreground-secondary">+ {bills.length - VISIBLE_ROWS} nas próximas contas</p>
      )}
    </button>
  );
}
