import { formatCurrency } from "@/lib/format/currency";

export interface Stat {
  label: string;
  value: number;
  emphasis?: boolean;
}

/** Done / pending / total breakdown of a list whose rows carry a checked flag (recebido, pago). */
export function checkedStats<T extends { valor: number }>(
  rows: T[],
  isChecked: (row: T) => boolean,
  labels: { done: string; pending: string },
): Stat[] {
  const total = rows.reduce((acc, row) => acc + row.valor, 0);
  const done = rows.filter(isChecked).reduce((acc, row) => acc + row.valor, 0);
  return [
    { label: labels.done, value: done },
    { label: labels.pending, value: total - done },
    { label: "Total previsto", value: total, emphasis: true },
  ];
}

/** Totals strip shown on top of a list; EntryList feeds it the rows left after filtering. */
export function TableFooterStats({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="grid gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <p className="break-words text-[11px] text-foreground-secondary">{stat.label}</p>
          <p className={`break-words tabular-nums ${stat.emphasis ? "text-sm font-semibold" : "text-sm font-medium"}`}>
            {formatCurrency(stat.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
