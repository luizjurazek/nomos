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
import { getMonthNumber } from "@/lib/sheets/monthNames";
import { TABLE_CONFIGS } from "@/lib/sheets/tableConfigs";
import type { ColumnRole, SheetCell, TableId } from "@/lib/sheets/types";

const QUEM_OPTIONS = ["Luiz", "Jéssica", "Luiz e Jéssica"];

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

function defaultValues(year: string, month: string): Record<ColumnRole, SheetCell> {
  return {
    date: `xx/${getMonthNumber(month)}/${year}`,
    name: "",
    category: "",
    quem: QUEM_OPTIONS[2],
    valor: 0,
    checkbox: false,
  };
}

export function EntryFormDialog({
  open,
  onOpenChange,
  tableId,
  year,
  month,
  categories,
  initialValues,
}: EntryFormDialogProps) {
  const config = TABLE_CONFIGS[tableId];
  const isEdit = initialValues?.rowIndex !== undefined;
  const [values, setValues] = useState<Record<ColumnRole, SheetCell>>(() => ({
    ...defaultValues(year, month),
    ...initialValues,
  }));
  const [installments, setInstallments] = useState(1);
  const [pending, startTransition] = useTransition();
  const showInstallments = config.installmentParsing && !isEdit;

  const setField = (role: ColumnRole, value: SheetCell) => setValues((prev) => ({ ...prev, [role]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar" : "Novo"} — {config.label}
          </DialogTitle>
          <DialogDescription>{month} de {year}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {config.columnOrder.map((role) => (
            <div key={role} className="flex flex-col gap-2">
              {role === "date" && (
                <>
                  <Label>Data</Label>
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
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    required
                    value={String(values.name ?? "")}
                    onChange={(event) => setField("name", event.target.value)}
                  />
                </>
              )}
              {role === "category" && config.categoryListKey && (
                <>
                  <Label>Categoria</Label>
                  <Select value={String(values.category ?? "")} onValueChange={(value) => setField("category", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {role === "quem" && (
                <>
                  <Label>Quem</Label>
                  <Select value={String(values.quem ?? "")} onValueChange={(value) => setField("quem", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUEM_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {role === "valor" && (
                <>
                  <Label htmlFor="valor">Valor</Label>
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
                    type="number"
                    min={1}
                    max={12}
                    className="w-20"
                    value={installments}
                    onChange={(event) => setInstallments(Math.max(1, Number(event.target.value) || 1))}
                  />
                  <span className="text-xs text-foreground-secondary">
                    Valor da parcela — cria uma linha por mês, de {month} em diante.
                  </span>
                </label>
              )}
              {role === "checkbox" && config.checkboxLabel && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(values.checkbox)}
                    onCheckedChange={(checked) => setField("checkbox", checked === true)}
                  />
                  {config.checkboxLabel}
                </label>
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
