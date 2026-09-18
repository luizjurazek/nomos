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
import { TABLE_THEME } from "./table-theme";

/** Vale Alimentação is a single menu entry: entrada/saída is chosen inside the form (saída by default). */
const MENU_OPTIONS: { tableId: TableId; title?: string }[] = [
  { tableId: "entradas" },
  { tableId: "debitos" },
  { tableId: "valeAlimentacaoConsumo", title: "Vale alimentação" },
  { tableId: "nubank" },
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
        {/* The popup defaults to the trigger's width (a 56px FAB), so give it its own width. */}
        <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-72 rounded-2xl p-2">
          <p className="px-2 pt-1 pb-2 text-xs font-medium tracking-wide text-foreground-secondary uppercase">
            Novo lançamento
          </p>
          {MENU_OPTIONS.map((option) => {
            const { tableId } = option;
            const { color, Icon } = TABLE_THEME[tableId];
            return (
              <DropdownMenuItem
                key={tableId}
                className="gap-3 rounded-xl px-2 py-2.5 text-base"
                onClick={() => setActiveTable(tableId)}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}26`, color }}
                >
                  <Icon className="size-5" />
                </span>
                {option.title ?? TABLE_THEME[tableId].title}
              </DropdownMenuItem>
            );
          })}
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
