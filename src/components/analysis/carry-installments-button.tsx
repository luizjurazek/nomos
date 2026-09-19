"use client";

import { CalendarPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyPendingInstallments, previewPendingInstallments } from "@/app/(app)/analise/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format/currency";
import type { PendingInstallment } from "@/lib/sheets/carryOver";
import { TABLE_CONFIGS } from "@/lib/sheets/tableConfigs";

/** Groups the pending rows by month, keeping the order they were planned in (chronological). */
function groupByMonth(items: PendingInstallment[]): { key: string; label: string; items: PendingInstallment[] }[] {
  const groups = new Map<string, { key: string; label: string; items: PendingInstallment[] }>();
  for (const item of items) {
    const key = `${item.year}-${item.month}`;
    const group = groups.get(key) ?? { key, label: `${item.month} ${item.year}`, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Carries the running installments (Entradas, Débitos, Nubank) into the months that do not have them yet, for
 * when a new month or year is created. It lists what would be written first and only writes on confirmation.
 */
export function CarryInstallmentsButton() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PendingInstallment[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [applying, startApplying] = useTransition();

  const openDialog = () => {
    setOpen(true);
    setItems(null);
    startLoading(async () => {
      try {
        setItems(await previewPendingInstallments());
      } catch {
        toast.error("Não foi possível ler as planilhas.");
        setOpen(false);
      }
    });
  };

  const apply = () =>
    startApplying(async () => {
      try {
        const { created, error } = await applyPendingInstallments();
        if (error) {
          toast.error(`Lançou ${created}, mas parou por um erro: ${error}. Clique de novo para continuar de onde parou.`);
        } else {
          toast.success(created === 1 ? "1 parcela lançada." : `${created} parcelas lançadas.`);
          setOpen(false);
        }
      } catch {
        toast.error("Não foi possível lançar as parcelas.");
      }
    });

  const groups = items ? groupByMonth(items) : [];

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={openDialog}>
        <CalendarPlus className="size-3.5" />
        Lançar parcelas
      </Button>
      <Dialog open={open} onOpenChange={(next) => !applying && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar parcelas nos próximos meses</DialogTitle>
            <DialogDescription>
              Copia cada parcela em andamento (entradas, débitos e cartão) para o mês seguinte que ainda não tem. Meses passados não são alterados.
            </DialogDescription>
          </DialogHeader>

          {(loading || items === null) && <p className="py-6 text-center text-sm text-foreground-secondary">Lendo as planilhas…</p>}

          {items !== null && !loading && items.length === 0 && (
            <p className="py-6 text-center text-sm text-foreground-secondary">
              Nada pendente: as parcelas já estão lançadas em todos os meses que têm aba.
            </p>
          )}

          {items !== null && !loading && items.length > 0 && (
            <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
              {groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-1">
                  <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">{group.label}</h3>
                  <ul className="flex flex-col gap-1">
                    {group.items.map((item) => (
                      <li key={`${item.tableId}-${item.name}`} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 break-words">
                          {item.name} <span className="text-xs text-foreground-secondary">· {TABLE_CONFIGS[item.tableId].label}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{formatCurrency(item.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={applying} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={applying || loading || !items || items.length === 0} onClick={apply}>
              {applying ? "Lançando…" : items && items.length > 0 ? `Lançar ${items.length} ${items.length === 1 ? "parcela" : "parcelas"}` : "Lançar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
