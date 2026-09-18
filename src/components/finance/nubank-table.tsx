"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NubankRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { InstallmentBadge } from "./installment-badge";
import { TableFooterStats } from "./table-footer-stats";
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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl py-0">
      <CardHeader className="shrink-0 py-3" style={{ backgroundColor: TABLE_HEADER_COLORS.nubank }}>
        <CardTitle className="flex items-center justify-between text-white">
          Nubank
          <span className="text-xs font-normal text-white/80">{rows.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto py-2">
        {rows.length === 0 && <p className="px-2 py-4 text-sm text-foreground-secondary">Nenhuma compra ainda.</p>}
        {rows.map((row) => (
          <EntryRow
            key={row.rowIndex}
            title={row.name}
            meta={`${row.categoria} · ${row.quem} · ${row.date}`}
            valor={row.valor}
            badges={row.installment && <InstallmentBadge installment={row.installment} />}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.rowIndex)}
            disabled={pending}
          />
        ))}
      </CardContent>
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
    </Card>
  );
}
