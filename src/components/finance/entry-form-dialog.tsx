"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createEntry, createInstallmentEntries, updateEntry } from "@/app/(app)/[year]/[month]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "./currency-input";
import { DateInput } from "./date-input";
import { TABLE_THEME } from "./table-theme";
import { isValidSheetDate } from "@/lib/format/date";
import { getMonthNumber } from "@/lib/sheets/monthNames";
import { TABLE_CONFIGS } from "@/lib/sheets/tableConfigs";
import type { ColumnRole, SheetCell, TableId } from "@/lib/sheets/types";

// Larger touch targets for the dropdown options on mobile.
const SELECT_ITEM_CLASS = "max-sm:min-h-12 max-sm:py-3 max-sm:text-base";

// Bigger checkbox (and check icon) on mobile.
const CHECKBOX_CLASS = "max-sm:size-6 max-sm:[&_svg]:size-5!";

const QUEM_OPTIONS = ["Luiz", "Jéssica", "Luiz e Jéssica"];

const VOUCHER_TABLES: { tableId: TableId; label: string }[] = [
  { tableId: "valeAlimentacaoCredito", label: "Entrada" },
  { tableId: "valeAlimentacaoConsumo", label: "Saída" },
];

export interface EntryFormInitialValues extends Partial<Record<ColumnRole, SheetCell>> {
  rowIndex?: number;
}

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: TableId;
  year: string;
  month: string;
  categories: string[];
  initialValues?: EntryFormInitialValues;
}

/** Today if it falls inside the month being viewed, otherwise the 1st: new entries start with a known day. */
function defaultDate(year: string, month: string): string {
  const monthNumber = getMonthNumber(month);
  const today = new Date();
  const isViewedMonth = String(today.getFullYear()) === year && String(today.getMonth() + 1).padStart(2, "0") === monthNumber;
  const day = isViewedMonth ? String(today.getDate()).padStart(2, "0") : "01";
  return `${day}/${monthNumber}/${year}`;
}

function defaultValues(year: string, month: string): Record<ColumnRole, SheetCell> {
  return {
    date: defaultDate(year, month),
    name: "",
    category: "",
    quem: "",
    valor: 0,
    checkbox: false,
  };
}

export function EntryFormDialog({
  open,
  onOpenChange,
  tableId: initialTableId,
  year,
  month,
  categories,
  initialValues,
}: EntryFormDialogProps) {
  const isEdit = initialValues?.rowIndex !== undefined;
  // Creating a Vale Alimentação entry lets the user pick between its two tables (credit / consumption) inside the form.
  const [tableId, setTableId] = useState<TableId>(initialTableId);
  const isVoucherCreate = !isEdit && VOUCHER_TABLES.some((option) => option.tableId === initialTableId);
  const config = TABLE_CONFIGS[tableId];
  const theme = TABLE_THEME[tableId];
  const [values, setValues] = useState<Record<ColumnRole, SheetCell>>(() => ({
    ...defaultValues(year, month),
    ...initialValues,
  }));
  // Raw text of the installments field, so it can sit empty while typing (a number state would snap back to 1).
  const [installmentsInput, setInstallmentsInput] = useState("1");
  const installments = Math.max(1, Number(installmentsInput) || 1);
  const [pending, startTransition] = useTransition();
  const showInstallments = config.installmentParsing && !isEdit;

  const setField = (role: ColumnRole, value: SheetCell) => setValues((prev) => ({ ...prev, [role]: value }));

  const selectVoucherTable = (next: TableId) => {
    if (next === tableId) return;
    setTableId(next);
    // The checkbox means "Recebido" on one table and "Pago" on the other, so it must not carry over.
    setField("checkbox", false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (config.columnOrder.includes("date") && !isValidSheetDate(String(values.date ?? ""))) {
      toast.error("Informe uma data válida (dd/mm/aaaa).");
      return;
    }
    if (config.columnOrder.includes("quem") && !values.quem) {
      toast.error("Selecione quem.");
      return;
    }
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateEntry(year, month, tableId, initialValues!.rowIndex!, values);
        } else if (showInstallments && installments > 1) {
          await createInstallmentEntries(year, month, tableId, values, installments);
        } else {
          await createEntry(year, month, tableId, values);
        }
        toast.success(isEdit ? "Lançamento atualizado." : "Lançamento adicionado.");
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] overflow-y-auto max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:data-open:slide-in-from-bottom-10 sm:max-w-md [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:hover:bg-white/15"
      >
        {/* Full-bleed header in the table's color, so each form is recognizable at a glance. */}
        <DialogHeader
          className="-mx-4 -mt-4 flex-row items-center gap-3 px-4 py-4 pr-12 text-white"
          style={{ backgroundColor: theme.color }}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <theme.Icon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-lg leading-tight font-semibold">{theme.title}</DialogTitle>
            <DialogDescription className="text-white/80">
              {isEdit ? "Editar lançamento" : "Novo lançamento"} · {month} de {year}
            </DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isVoucherCreate && (
            <div className="flex flex-col gap-2">
              <Label className="max-sm:text-base">Tipo</Label>
              <Select value={tableId} onValueChange={(value) => selectVoucherTable(value as TableId)}>
                <SelectTrigger className="h-11 w-full text-base">
                  <SelectValue>{VOUCHER_TABLES.find((option) => option.tableId === tableId)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VOUCHER_TABLES.map((option) => (
                    <SelectItem key={option.tableId} value={option.tableId} className={SELECT_ITEM_CLASS}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {config.columnOrder.map((role) => (
            <div key={role} className="flex flex-col gap-2">
              {role === "date" && (
                <>
                  <Label className="max-sm:text-base">Data</Label>
                  <DateInput
                    value={String(values.date ?? "")}
                    onChange={(value) => setField("date", value)}
                    defaultMonth={getMonthNumber(month)}
                    defaultYear={year}
                  />
                </>
              )}
              {role === "name" && (
                <>
                  <Label htmlFor="name" className="max-sm:text-base">Nome</Label>
                  <Input
                    id="name"
                    required
                    className="h-11 text-base"
                    value={String(values.name ?? "")}
                    onChange={(event) => setField("name", event.target.value)}
                  />
                </>
              )}
              {role === "category" && config.categoryListKey && (
                <>
                  <Label className="max-sm:text-base">Categoria</Label>
                  <Select value={String(values.category ?? "")} onValueChange={(value) => setField("category", value)}>
                    <SelectTrigger className="h-11 w-full text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category} className={SELECT_ITEM_CLASS}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {role === "quem" && (
                <>
                  <Label className="max-sm:text-base">Quem</Label>
                  <Select value={String(values.quem ?? "")} onValueChange={(value) => setField("quem", value)}>
                    <SelectTrigger className="h-11 w-full text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUEM_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className={SELECT_ITEM_CLASS}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {role === "valor" && (
                <>
                  <Label htmlFor="valor" className="max-sm:text-base">Valor</Label>
                  <CurrencyInput
                    id="valor"
                    value={Number(values.valor ?? 0)}
                    onChange={(value) => setField("valor", value)}
                  />
                </>
              )}
              {role === "valor" && showInstallments && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0">Parcelas</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className="h-11 w-20"
                    value={installmentsInput}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => setInstallmentsInput(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    onBlur={() => setInstallmentsInput(String(installments))}
                  />
                  <span className="text-xs text-foreground-secondary">
                    Valor da parcela — cria uma linha por mês, de {month} em diante.
                  </span>
                </label>
              )}
              {role === "checkbox" && config.checkboxLabel && (
                <label className="flex min-h-12 items-center gap-3 text-sm max-sm:text-base">
                  <Checkbox
                    className={CHECKBOX_CLASS}
                    checked={Boolean(values.checkbox)}
                    onCheckedChange={(checked) => setField("checkbox", checked === true)}
                  />
                  {config.checkboxLabel}
                </label>
              )}
            </div>
          ))}
          <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full text-base text-white hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: theme.color }}
            >
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
