"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { DebitoRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryList } from "./entry-list";
import { EntryRow } from "./entry-row";
import { TableFooterStats } from "./table-footer-stats";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TableSectionHeader } from "./table-section-header";
import { TagBadge } from "./tag-badge";
import { useOptimisticChecked, useRowActions } from "./use-row-actions";

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
  const [optimisticRows, applyOptimisticToggle] = useOptimisticChecked(rows, "pago");
  const { toggle, remove, pending } = useRowActions("debitos", year, month, applyOptimisticToggle);

  const totals = useMemo(() => {
    const total = optimisticRows.reduce((acc, row) => acc + row.valor, 0);
    const pago = optimisticRows.filter((row) => row.pago).reduce((acc, row) => acc + row.valor, 0);
    return { pago, aPagar: total - pago, total };
  }, [optimisticRows]);

  return (
    <section className="flex flex-col gap-3">
      <TableSectionHeader title="Débitos" count={rows.length} />
      <EntryList
        rows={optimisticRows}
        filterable
        emptyMessage="Nenhum lançamento ainda."
        renderRow={(row) => (
          <EntryRow
            title={row.name}
            meta={`${row.categoria} · ${row.quem}`}
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
        )}
      />
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
