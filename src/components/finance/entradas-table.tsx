"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EntradaRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { TableFooterStats } from "./table-footer-stats";
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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl py-0">
      <CardHeader className="shrink-0 py-3" style={{ backgroundColor: TABLE_HEADER_COLORS.entradas }}>
        <CardTitle className="flex items-center justify-between text-white">
          Entradas
          <span className="text-xs font-normal text-white/80">{rows.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto py-2">
        {rows.length === 0 && <p className="px-2 py-4 text-sm text-foreground-secondary">Nenhum lançamento ainda.</p>}
        {rows.map((row) => (
          <EntryRow
            key={row.rowIndex}
            title={row.name}
            meta={`${row.categoria} · ${row.date}`}
            valor={row.valor}
            badges={row.isReservaWithdrawal ? <TagBadge tag="transferenciaReserva" /> : null}
            checked={row.recebido}
            onToggle={(value) => toggle(row.rowIndex, value)}
            onEdit={() => setEditing(row)}
            onDelete={() => remove(row.rowIndex)}
            disabled={pending}
          />
        ))}
      </CardContent>
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
    </Card>
  );
}
