"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { deleteEntry, toggleChecked } from "@/app/(app)/[year]/[month]/actions";
import type { TableId } from "@/lib/sheets/types";

/**
 * Optimistic copy of `rows` for a status field ("pago" / "recebido"). Call the returned setter inside
 * a transition (`useRowActions` does): the row flips immediately and React reverts it on its own if
 * the server action fails or once the refreshed rows arrive.
 */
export function useOptimisticChecked<T extends { rowIndex: number }>(rows: T[], field: "pago" | "recebido") {
  return useOptimistic(rows, (state, update: { rowIndex: number; value: boolean }) =>
    state.map((row) => (row.rowIndex === update.rowIndex ? ({ ...row, [field]: update.value } as T) : row)),
  );
}

export function useRowActions(
  tableId: TableId,
  year: string,
  month: string,
  applyOptimisticToggle?: (update: { rowIndex: number; value: boolean }) => void,
) {
  const [pending, startTransition] = useTransition();

  const toggle = (rowIndex: number, value: boolean) => {
    startTransition(async () => {
      applyOptimisticToggle?.({ rowIndex, value });
      try {
        await toggleChecked(year, month, tableId, rowIndex, value);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
      }
    });
  };

  // Confirmation happens in EntryRow (it also serves the swipe action), so this deletes right away.
  const remove = (rowIndex: number) => {
    startTransition(async () => {
      try {
        await deleteEntry(year, month, tableId, rowIndex);
        toast.success("Lançamento excluído.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
      }
    });
  };

  return { toggle, remove, pending };
}
