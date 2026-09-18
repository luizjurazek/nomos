"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { DebitoRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { TableFooterStats } from "./table-footer-stats";
import { TableSectionHeader } from "./table-section-header";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TagBadge } from "./tag-badge";
import { useRowActions } from "./use-row-actions";

export function DebitosTable({
  rows,
  year,
  month,
  categories,
}: {
  rows: DebitoRow[];
  year: string;
  month: string;
  categories: string[];
}) {
  const [editing, setEditing] = useState<DebitoRow | null>(null);
  const { toggle, remove, pending } = useRowActions("debitos", year, month);

  const totals = useMemo(() => {
    const total = rows.reduce((acc, row) => acc + row.valor, 0);
    const pago = rows.filter((row) => row.pago).reduce((acc, row) => acc + row.valor, 0);
    return { pago, aPagar: total - pago, total };
  }, [rows]);

  return (
    <section className="flex flex-col gap-3">
      <TableSectionHeader title="Débitos" count={rows.length} />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-foreground-secondary">Nenhum lançamento ainda.</p>}
        {rows.map((row) => (
          <EntryRow
            key={row.rowIndex}
            title={row.name}
            meta={`${row.categoria} · ${row.quem} · ${row.date}`}
            valor={row.valor}
            accent={TABLE_HEADER_COLORS.debitos}
            badges={
              <>
                {row.isPoupanca && <TagBadge tag="poupanca" />}
                {row.isCardRollover && (
                  <Badge variant="outline" className="font-normal">
                    Sincronizado automaticamente
                  </Badge>
                )}
              </>
            }
            checked={row.pago}
            checkedLabel="Pago"
            uncheckedLabel="A pagar"
            onToggle={(value) => toggle(row.rowIndex, value)}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.rowIndex)}
            disabled={pending}
          />
        ))}
      </div>
      <TableFooterStats
        stats={[
          { label: "Pago", value: totals.pago },
          { label: "A pagar", value: totals.aPagar },
          { label: "Total previsto", value: totals.total, emphasis: true },
        ]}
      />

      {editing && (
        <EntryFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          tableId="debitos"
          year={year}
          month={month}
          categories={categories}
          initialValues={{
            rowIndex: editing.rowIndex,
            date: editing.date,
            name: editing.name,
            category: editing.categoria,
            quem: editing.quem,
            valor: editing.valor,
            checkbox: editing.pago,
          }}
        />
      )}
    </section>
  );
}
