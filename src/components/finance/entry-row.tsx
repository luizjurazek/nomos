"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format/currency";

interface EntryRowProps {
  title: string;
  meta: string;
  valor: number;
  badges?: ReactNode;
  checked?: boolean;
  onToggle?: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function EntryRow({ title, meta, valor, badges, checked, onToggle, onEdit, onDelete, disabled }: EntryRowProps) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">{title}</p>
          {badges}
        </div>
        <p className="truncate text-xs text-foreground-secondary">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-1 text-sm font-medium tabular-nums">{formatCurrency(valor)}</span>
        {onToggle && <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-foreground-secondary hover:text-foreground"
          onClick={onEdit}
          aria-label="Editar"
          disabled={disabled}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-foreground-secondary hover:text-destructive"
          onClick={onDelete}
          aria-label="Excluir"
          disabled={disabled}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
