"use client";

import { useMemo, useState } from "react";
import type { EntradaRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryList } from "./entry-list";
import { EntryRow } from "./entry-row";
import { TableFooterStats } from "./table-footer-stats";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TableSectionHeader } from "./table-section-header";
import { TagBadge } from "./tag-badge";
import { useOptimisticChecked, useRowActions } from "./use-row-actions";

export function EntradasTable({
  rows,
  year,
  month,
  categories,
}: {
  rows: EntradaRow[];
  year: string;
  month: string;
  categories: string[];
}) {
  const [editing, setEditing] = useState<EntradaRow | null>(null);
  const [optimisticRows, applyOptimisticToggle] = useOptimisticChecked(rows, "recebido");
  const { toggle, remove, pending } = useRowActions("entradas", year, month, applyOptimisticToggle);

  const totals = useMemo(() => {
    const total = optimisticRows.reduce((acc, row) => acc + row.valor, 0);
    const recebido = optimisticRows.filter((row) => row.recebido).reduce((acc, row) => acc + row.valor, 0);
    return { recebido, aReceber: total - recebido, total };
  }, [optimisticRows]);

  return (
    <section className="flex flex-col gap-3">
      <TableSectionHeader title="Entradas" count={rows.length} />
      <EntryList
        rows={optimisticRows}
        filterable
        emptyMessage="Nenhum lançamento ainda."
        renderRow={(row) => (
          <EntryRow
            title={row.name}
            meta={row.categoria}
            valor={row.valor}
            accent={TABLE_HEADER_COLORS.entradas}
            badges={row.isReservaWithdrawal ? <TagBadge tag="transferenciaReserva" /> : null}
            checked={row.recebido}
            checkedLabel="Recebido"
            uncheckedLabel="A receber"
            onToggle={(value) => toggle(row.rowIndex, value)}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.rowIndex)}
            disabled={pending}
          />
        )}
      />
      <TableFooterStats
        stats={[
          { label: "Recebido", value: totals.recebido },
          { label: "A receber", value: totals.aReceber },
          { label: "Total previsto", value: totals.total, emphasis: true },
        ]}
      />

      {editing && (
        <EntryFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          tableId="entradas"
          year={year}
          month={month}
          categories={categories}
          initialValues={{
            rowIndex: editing.rowIndex,
            date: editing.date,
            name: editing.name,
            category: editing.categoria,
            valor: editing.valor,
            checkbox: editing.recebido,
          }}
        />
      )}
    </section>
  );
}
