"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ValeAlimentacaoConsumoRow, ValeAlimentacaoCreditoRow } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";
import { EntryRow } from "./entry-row";
import { TABLE_HEADER_COLORS } from "./table-colors";
import { TableFooterStats } from "./table-footer-stats";
import { useRowActions } from "./use-row-actions";

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
  const creditoActions = useRowActions("valeAlimentacaoCredito", year, month);
  const consumoActions = useRowActions("valeAlimentacaoConsumo", year, month);

  const totals = useMemo(() => {
    const recebido = credito.reduce((acc, row) => acc + row.valor, 0);
    const gasto = consumo.filter((row) => row.pago).reduce((acc, row) => acc + row.valor, 0);
    return { recebido, gasto, saldo: recebido - gasto };
  }, [credito, consumo]);

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl py-0">
      <CardHeader className="shrink-0 py-3" style={{ backgroundColor: TABLE_HEADER_COLORS.valeAlimentacaoConsumo }}>
        <CardTitle className="flex items-center justify-between text-white">
          Vale Alimentação
          <span className="text-xs font-normal text-white/80">{credito.length + consumo.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2">
        <div>
          <div className="mb-1 flex items-center justify-between px-2">
            <p className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">Recebido</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-foreground-secondary hover:text-foreground"
              onClick={() => setCreatingCredito(true)}
              aria-label="Adicionar recebido"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          {credito.length === 0 && <p className="px-2 py-2 text-sm text-foreground-secondary">Nada recebido ainda.</p>}
          {credito.map((row) => (
            <EntryRow
              key={row.rowIndex}
              title={row.name}
              meta={`${row.quem} · ${row.date}`}
              valor={row.valor}
              checked={row.recebido}
              onToggle={(value) => creditoActions.toggle(row.rowIndex, value)}
              onEdit={() => setEditingCredito(row)}
              onDelete={() => creditoActions.remove(row.rowIndex)}
              disabled={creditoActions.pending}
            />
          ))}
        </div>

        <div>
          <p className="mb-1 px-2 text-xs font-medium tracking-wide text-foreground-secondary uppercase">Gastos</p>
          {consumo.length === 0 && <p className="px-2 py-2 text-sm text-foreground-secondary">Nenhum gasto ainda.</p>}
          {consumo.map((row) => (
            <EntryRow
              key={row.rowIndex}
              title={row.name}
              meta={`${row.quem} · ${row.date}`}
              valor={row.valor}
              checked={row.pago}
              onToggle={(value) => consumoActions.toggle(row.rowIndex, value)}
              onEdit={() => setEditingConsumo(row)}
              onDelete={() => consumoActions.remove(row.rowIndex)}
              disabled={consumoActions.pending}
            />
          ))}
        </div>
      </CardContent>
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
    </Card>
  );
}
