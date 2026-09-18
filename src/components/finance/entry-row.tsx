"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format/currency";
import { StatusPill } from "./status-pill";

interface EntryRowProps {
  title: string;
  meta: string;
  valor: number;
  badges?: ReactNode;
  /** Color of the leading avatar; falls back to a neutral tone. */
  accent?: string;
  checked?: boolean;
  /** Status labels for the pill, e.g. "Pago" / "A pagar". Only used when `onToggle` is set. */
  checkedLabel?: string;
  uncheckedLabel?: string;
  onToggle?: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function EntryRow({
  title,
  meta,
  valor,
  badges,
  accent,
  checked,
  checkedLabel = "Feito",
  uncheckedLabel = "Pendente",
  onToggle,
  onEdit,
  onDelete,
  disabled,
}: EntryRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground-secondary"
        style={accent ? { backgroundColor: `${accent}26`, color: accent } : undefined}
        aria-hidden
      >
        {title.trim().charAt(0).toUpperCase() || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">{title}</p>
          {badges}
        </div>
        <p className="truncate text-xs text-foreground-secondary">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums">{formatCurrency(valor)}</span>
          {onToggle && (
            <StatusPill
              checked={Boolean(checked)}
              checkedLabel={checkedLabel}
              uncheckedLabel={uncheckedLabel}
              onToggle={onToggle}
              disabled={disabled}
            />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-foreground-secondary"
                aria-label="Ações"
                disabled={disabled}
              >
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
