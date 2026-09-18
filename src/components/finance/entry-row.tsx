"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format/currency";
import { StatusPill } from "./status-pill";

/** Width of the Editar / Excluir buttons revealed by swiping a row to the left. */
const ACTIONS_WIDTH = 144;
/** Finger travel (px) before we decide whether the gesture is a swipe or a vertical scroll. */
const LOCK_THRESHOLD = 8;

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
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const gesture = useRef<{ x: number; y: number; from: number; horizontal: boolean | null } | null>(null);

  const isOpen = offset < 0;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Mouse users have the "⋮" menu; swiping is a touch/pen gesture.
    if (event.pointerType === "mouse" || disabled) return;
    gesture.current = { x: event.clientX, y: event.clientY, from: offset, horizontal: null };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;

    if (current.horizontal === null) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return;
      current.horizontal = Math.abs(dx) > Math.abs(dy);
      if (current.horizontal) {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
    }
    if (!current.horizontal) return;
    setOffset(Math.min(0, Math.max(-ACTIONS_WIDTH, current.from + dx)));
  };

  const finishGesture = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.horizontal) return;
    setDragging(false);
    setOffset((value) => (value < -ACTIONS_WIDTH / 2 ? -ACTIONS_WIDTH : 0));
  };

  const closeActions = () => setOffset(0);

  const askDelete = () => {
    closeActions();
    setConfirmingDelete(true);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
        <button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => {
            closeActions();
            onEdit();
          }}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-primary text-xs font-medium text-primary-foreground"
        >
          <Pencil className="size-4" />
          Editar
        </button>
        <button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={askDelete}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-xs font-medium text-white"
        >
          <Trash2 className="size-4" />
          Excluir
        </button>
      </div>

      <div
        className={`relative flex touch-pan-y items-center gap-3 bg-card px-4 py-3 ${
          dragging ? "" : "transition-transform duration-200"
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        // While the actions are showing, a tap on the row only closes them.
        onClickCapture={(event) => {
          if (!isOpen) return;
          event.stopPropagation();
          closeActions();
        }}
      >
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
                  className="-mr-2 size-11 text-foreground-secondary"
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
              <DropdownMenuItem variant="destructive" onClick={askDelete}>
                <Trash2 className="size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg">Excluir lançamento?</DialogTitle>
            <DialogDescription>
              “{title}” ({formatCurrency(valor)}) será removido da planilha. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end">
            <Button variant="outline" className="h-11 flex-1 sm:h-8 sm:flex-none" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 sm:h-8 sm:flex-none"
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
