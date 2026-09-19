"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ValeAlimentacaoConsumoRow, ValeAlimentacaoCreditoRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryList } from "./entry-list";
import { EntryRow } from "./entry-row";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TableFooterStats } from "./table-footer-stats";
import { TableSectionHeader } from "./table-section-header";
import { useOptimisticChecked, useRowActions } from "./use-row-actions";

export function ValeAlimentacaoTable({
  credito,
  consumo,
  year,
  month,
}: {
  credito: ValeAlimentacaoCreditoRow[];
  consumo: ValeAlimentacaoConsumoRow[];
  year: string;
  month: string;
}) {
  const [editingCredito, setEditingCredito] = useState<ValeAlimentacaoCreditoRow | null>(null);
  const [editingConsumo, setEditingConsumo] = useState<ValeAlimentacaoConsumoRow | null>(null);
  const [creatingCredito, setCreatingCredito] = useState(false);
  const [optimisticCredito, applyCreditoToggle] = useOptimisticChecked(credito, "recebido");
  const [optimisticConsumo, applyConsumoToggle] = useOptimisticChecked(consumo, "pago");
  const creditoActions = useRowActions("valeAlimentacaoCredito", year, month, applyCreditoToggle);
  const consumoActions = useRowActions("valeAlimentacaoConsumo", year, month, applyConsumoToggle);

  const totals = useMemo(() => {
    const recebido = optimisticCredito.reduce((acc, row) => acc + row.valor, 0);
    const gasto = optimisticConsumo.filter((row) => row.pago).reduce((acc, row) => acc + row.valor, 0);
    return { recebido, gasto, saldo: recebido - gasto };
  }, [optimisticCredito, optimisticConsumo]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <TableSectionHeader
            title="Recebido"
            count={credito.length}
            action={
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-foreground-secondary hover:text-foreground"
                onClick={() => setCreatingCredito(true)}
                aria-label="Adicionar recebido"
              >
                <Plus className="size-4" />
              </Button>
            }
          />
          <EntryList
            rows={optimisticCredito}
            filterable
            memoryKey="vale-credito"
            emptyMessage="Nada recebido ainda."
            renderRow={(row) => (
              <EntryRow
                title={row.name}
                meta={row.quem}
                valor={row.valor}
                accent={TABLE_HEADER_COLORS.valeAlimentacaoCredito}
                checked={row.recebido}
                checkedLabel="Recebido"
                uncheckedLabel="A receber"
                onToggle={(value) => creditoActions.toggle(row.rowIndex, value)}
                onEdit={() => setEditingCredito(row)}
                onDelete={() => creditoActions.remove(row.rowIndex)}
                disabled={creditoActions.pending}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <TableSectionHeader
            title="Gastos"
            count={consumo.length}
          />
          <EntryList
            rows={optimisticConsumo}
            filterable
            memoryKey="vale-consumo"
            emptyMessage="Nenhum gasto ainda."
            renderRow={(row) => (
              <EntryRow
                title={row.name}
                meta={row.quem}
                valor={row.valor}
                accent={TABLE_HEADER_COLORS.valeAlimentacaoConsumo}
                checked={row.pago}
                checkedLabel="Pago"
                uncheckedLabel="A pagar"
                onToggle={(value) => consumoActions.toggle(row.rowIndex, value)}
                onEdit={() => setEditingConsumo(row)}
                onDelete={() => consumoActions.remove(row.rowIndex)}
                disabled={consumoActions.pending}
              />
            )}
          />
        </div>
      </div>
      <TableFooterStats
        stats={[
          { label: "Recebido", value: totals.recebido },
          { label: "Gasto", value: totals.gasto },
          { label: "Saldo", value: totals.saldo, emphasis: true },
        ]}
      />

      {creatingCredito && (
        <EntryFormDialog
          open={creatingCredito}
          onOpenChange={setCreatingCredito}
          tableId="valeAlimentacaoCredito"
          year={year}
          month={month}
          categories={[]}
        />
      )}

      {editingCredito && (
        <EntryFormDialog
          open={Boolean(editingCredito)}
          onOpenChange={(open) => !open && setEditingCredito(null)}
          tableId="valeAlimentacaoCredito"
          year={year}
          month={month}
          categories={[]}
          initialValues={{
            rowIndex: editingCredito.rowIndex,
            date: editingCredito.date,
            name: editingCredito.name,
            quem: editingCredito.quem,
            valor: editingCredito.valor,
            checkbox: editingCredito.recebido,
          }}
        />
      )}

      {editingConsumo && (
        <EntryFormDialog
          open={Boolean(editingConsumo)}
          onOpenChange={(open) => !open && setEditingConsumo(null)}
          tableId="valeAlimentacaoConsumo"
          year={year}
          month={month}
          categories={[]}
          initialValues={{
            rowIndex: editingConsumo.rowIndex,
            date: editingConsumo.date,
            name: editingConsumo.name,
            quem: editingConsumo.quem,
            valor: editingConsumo.valor,
            checkbox: editingConsumo.pago,
          }}
        />
      )}
    </section>
  );
}
