"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteEntry, toggleChecked } from "@/app/(app)/[year]/[month]/actions";
import type { TableId } from "@/lib/sheets/types";

export function useRowActions(tableId: TableId, year: string, month: string) {
  const [pending, startTransition] = useTransition();

  const toggle = (rowIndex: number, value: boolean) => {
    startTransition(async () => {
      try {
        await toggleChecked(year, month, tableId, rowIndex, value);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar.");
      }
    });
  };

  const remove = (rowIndex: number) => {
    if (!window.confirm("Excluir este lançamento?")) return;
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
