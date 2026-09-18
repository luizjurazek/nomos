import { CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";

interface Stat {
  label: string;
  value: number;
  emphasis?: boolean;
}

/** Mirrors the "Total recebido / Total previsto" style footer rows each table had in the original sheet. */
export function TableFooterStats({ stats }: { stats: Stat[] }) {
  return (
    <CardFooter
      className="grid shrink-0 gap-2 rounded-b-2xl border-t border-border bg-muted/40 px-4 py-2.5"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <p className="truncate text-[11px] text-foreground-secondary">{stat.label}</p>
          <p className={`truncate tabular-nums ${stat.emphasis ? "text-sm font-semibold" : "text-sm font-medium"}`}>
            {formatCurrency(stat.value)}
          </p>
        </div>
      ))}
    </CardFooter>
  );
}
