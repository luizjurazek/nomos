import { formatCurrency } from "@/lib/format/currency";

/** Compact food-voucher balance card; tapping it jumps to the Vale Alimentação list. */
export function VaBalanceCard({ saldo, color, onSelect }: { saldo: number; color: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="glass-surface flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-accent/60"
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm text-foreground-secondary">Saldo vale alimentação</span>
      <span className="text-base font-semibold tabular-nums">{formatCurrency(saldo)}</span>
    </button>
  );
}
