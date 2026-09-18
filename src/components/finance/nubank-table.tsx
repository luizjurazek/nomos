"use client";

import { useMemo, useState } from "react";
import type { NubankRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { InstallmentBadge } from "./installment-badge";
import { TableFooterStats } from "./table-footer-stats";
import { TableSectionHeader } from "./table-section-header";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { useRowActions } from "./use-row-actions";

export function NubankTable({
  rows,
  year,
  month,
  categories,
}: {
  rows: NubankRow[];
  year: string;
  month: string;
  categories: string[];
}) {
  const [editing, setEditing] = useState<NubankRow | null>(null);
  const { remove, pending } = useRowActions("nubank", year, month);

  const total = useMemo(() => rows.reduce((acc, row) => acc + row.valor, 0), [rows]);

  return (
    <section className="flex flex-col gap-3">
      <TableSectionHeader title="Nubank" count={rows.length} />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-foreground-secondary">Nenhuma compra ainda.</p>}
        {rows.map((row) => (
          <EntryRow
            key={row.rowIndex}
            title={row.name}
            meta={`${row.categoria} · ${row.quem} · ${row.date}`}
            valor={row.valor}
            accent={TABLE_HEADER_COLORS.nubank}
            badges={row.installment && <InstallmentBadge installment={row.installment} />}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.rowIndex)}
            disabled={pending}
          />
        ))}
      </div>
      <TableFooterStats stats={[{ label: "Total do mês", value: total, emphasis: true }]} />

      {editing && (
        <EntryFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          tableId="nubank"
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
          }}
        />
      )}
    </section>
  );
}
