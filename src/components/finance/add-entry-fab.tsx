"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TABLE_CONFIGS } from "@/lib/sheets/tableConfigs";
import type { Categories, TableId } from "@/lib/sheets/types";
import { EntryFormDialog } from "./entry-form-dialog";

const CREATABLE_TABLES: TableId[] = [
  "entradas",
  "debitos",
  "valeAlimentacaoCredito",
  "valeAlimentacaoConsumo",
  "nubank",
];

export function AddEntryFab({ year, month }: { year: string; month: string }) {
  const [activeTable, setActiveTable] = useState<TableId | null>(null);
  const [categories, setCategories] = useState<Categories>({ entradas: [], saidas: [] });

  useEffect(() => {
    fetch(`/api/years/${year}/categories`)
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});
  }, [year]);

  const activeConfig = activeTable ? TABLE_CONFIGS[activeTable] : null;
  const activeCategories =
    activeConfig?.categoryListKey === "Entradas"
      ? categories.entradas
      : activeConfig?.categoryListKey === "Saidas"
        ? categories.saidas
        : [];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              className="fixed bottom-6 right-6 z-20 size-14 rounded-full shadow-lg"
              aria-label="Adicionar lançamento"
            >
              <Plus className="size-6" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {CREATABLE_TABLES.map((tableId) => (
            <DropdownMenuItem key={tableId} onClick={() => setActiveTable(tableId)}>
              {TABLE_CONFIGS[tableId].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeTable && (
        <EntryFormDialog
          open={Boolean(activeTable)}
          onOpenChange={(open) => !open && setActiveTable(null)}
          tableId={activeTable}
          year={year}
          month={month}
          categories={activeCategories}
        />
      )}
    </>
  );
}
