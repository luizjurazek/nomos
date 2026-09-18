"use client";

import { useMemo, useState } from "react";
import type { EntradaRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { TableFooterStats } from "./table-footer-stats";
import { TableSectionHeader } from "./table-section-header";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TagBadge } from "./tag-badge";
import { useRowActions } from "./use-row-actions";

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
  const { toggle, remove, pending } = useRowActions("entradas", year, month);

  const totals = useMemo(() => {
    const total = rows.reduce((acc, row) => acc + row.valor, 0);
    const recebido = rows.filter((row) => row.recebido).reduce((acc, row) => acc + row.valor, 0);
    return { recebido, aReceber: total - recebido, total };
  }, [rows]);

  return (
    <section className="flex flex-col gap-3">
      <TableSectionHeader title="Entradas" count={rows.length} />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-foreground-secondary">Nenhum lançamento ainda.</p>}
        {rows.map((row) => (
          <EntryRow
            key={row.rowIndex}
            title={row.name}
            meta={`${row.categoria} · ${row.date}`}
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
        ))}
      </div>
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
