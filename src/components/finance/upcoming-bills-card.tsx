"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format/currency";
import { UNKNOWN_DAY_KEY, dayKey, dayLabel, daysFromToday } from "@/lib/format/dayGroups";
import type { DebitoRow } from "@/lib/sheets/types";
import { useToday } from "./use-today";
import { useOptimisticChecked, useRowActions } from "./use-row-actions";

/** Unpaid bills due within this many days (or already overdue) show up in the dropdown. */
const HORIZON_DAYS = 7;

function dueLabel(diff: number): string {
  if (diff < 0) return `Atrasada há ${-diff} ${-diff === 1 ? "dia" : "dias"}`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

interface UpcomingBillsCardProps {
  debitos: DebitoRow[];
  year: string;
  month: string;
  /** Jumps to the full Débitos list. */
  onSelect: () => void;
}

/**
 * Collapsible heads-up on the month screen for unpaid Débitos that are overdue or due soon, where each
 * bill can be marked as paid right away. Only looks at the current calendar month.
 */
export function UpcomingBillsCard({ debitos, year, month, onSelect }: UpcomingBillsCardProps) {
  const today = useToday();
  const [open, setOpen] = useState(false);
  // A paid bill leaves the list immediately; React reverts it if the action fails.
  const [optimisticDebitos, applyOptimisticToggle] = useOptimisticChecked(debitos, "pago");
  const { toggle, pending } = useRowActions("debitos", year, month, applyOptimisticToggle);

  const bills = useMemo(() => {
    if (!today) return [];
    return optimisticDebitos
      .filter((row) => !row.pago)
      .flatMap((row) => {
        const key = dayKey(row.date);
        if (key === UNKNOWN_DAY_KEY || key.slice(0, 7) !== today.slice(0, 7)) return [];
        const diff = daysFromToday(key, today);
        return diff <= HORIZON_DAYS ? [{ row, diff, key }] : [];
      })
      .sort((a, b) => a.diff - b.diff);
  }, [optimisticDebitos, today]);

  if (bills.length === 0) return null;

  const total = bills.reduce((acc, bill) => acc + bill.row.valor, 0);
  const hasOverdue = bills[0].diff < 0;

  return (
    <section className="glass-surface overflow-hidden rounded-2xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
      >
        <span className={`size-2.5 shrink-0 rounded-full ${hasOverdue ? "bg-destructive" : "bg-warning"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Contas a vencer</p>
          <p className={`truncate text-xs ${hasOverdue ? "text-destructive" : "text-foreground-secondary"}`}>
            {bills.length} {bills.length === 1 ? "conta" : "contas"} · {dueLabel(bills[0].diff)}
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-foreground-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <ul className="divide-y divide-border">
            {bills.map(({ row, diff, key }) => (
              <li key={row.rowIndex} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{row.name}</p>
                  {/* dayLabel with no `today` always yields the plain date ("20 de setembro"), never "Hoje"/"Amanhã". */}
                  <p className={`text-xs ${diff < 0 ? "text-destructive" : "text-foreground-secondary"}`}>
                    {dueLabel(diff)} · {dayLabel(key, null)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-sm tabular-nums">{formatCurrency(row.valor)}</span>
                  <button
                    type="button"
                    onClick={() => toggle(row.rowIndex, true)}
                    disabled={pending}
                    aria-label={`Marcar ${row.name} como paga`}
                    className="flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-accent/60 disabled:opacity-50"
                  >
                    <Check className="size-3" />
                    Pagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onSelect}
            className="w-full border-t border-border px-4 py-3.5 text-center text-sm font-medium text-foreground-secondary transition-colors hover:bg-accent/60"
          >
            Ver todos os débitos
          </button>
        </div>
      )}
    </section>
  );
}
