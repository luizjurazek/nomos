"use client";

import { ArrowRightLeft } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyBalanceTransferAction } from "@/app/(app)/[year]/[month]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format/currency";
import { CARRIED_BALANCE_NAME, transferredBalanceName, type BalanceTransferPlan } from "@/lib/sheets/balanceTransfer";

const KIND_LABEL = { saldo: "Saldo", vale: "Vale alimentação" } as const;

/**
 * First days of the month: offers to move the previous month's leftover (balance and food voucher) into this
 * one. Shows what each month gets before writing anything, and only writes on confirmation.
 */
export function BalanceTransferCard({ plan }: { plan: BalanceTransferPlan }) {
  const [open, setOpen] = useState(false);
  const [applying, startApplying] = useTransition();
  const { from, to, legs, pending } = plan;
  const hasPending = pending.aReceber !== 0 || pending.aPagar !== 0;

  const apply = () =>
    startApplying(async () => {
      try {
        const { error } = await applyBalanceTransferAction(to.year, to.month);
        if (error) {
          toast.error(`A transferência parou por um erro: ${error}. Tente de novo para terminar de onde parou.`);
          return;
        }
        toast.success(`Saldo de ${from.month} transferido para ${to.month}.`);
        setOpen(false);
      } catch {
        toast.error("Não foi possível transferir o saldo.");
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-surface flex w-full items-center gap-3 rounded-2xl border border-primary/40 px-4 py-3 text-left transition-colors hover:bg-accent/60"
      >
        <ArrowRightLeft className="size-4 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">Transferir saldo de {from.month}</span>
          <span className="text-xs text-foreground-secondary tabular-nums">
            {legs.map((leg) => `${KIND_LABEL[leg.kind]} ${formatCurrency(leg.amount)}`).join(" · ")}
          </span>
        </span>
        <span className="text-sm font-medium text-primary">Revisar</span>
      </button>

      <Dialog open={open} onOpenChange={(next) => !applying && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferir saldo para {to.month}</DialogTitle>
            <DialogDescription>
              O que sobrou em {from.month} passa para {to.month}. {from.month} recebe uma saída que zera o saldo, e {to.month} uma
              entrada com o mesmo valor.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {legs.map((leg) => (
              <section key={leg.kind} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xs font-medium tracking-wide text-foreground-secondary uppercase">{KIND_LABEL[leg.kind]}</h3>
                  <span className="font-semibold tabular-nums">{formatCurrency(leg.amount)}</span>
                </div>
                <ul className="flex flex-col gap-0.5 text-sm text-foreground-secondary">
                  {leg.writeSource && (
                    <li>
                      {from.month}: “{transferredBalanceName(to.month)}” em {leg.kind === "saldo" ? "Débitos" : "gastos do vale"}
                    </li>
                  )}
                  {leg.writeTarget && (
                    <li>
                      {to.month}: “{CARRIED_BALANCE_NAME}” em {leg.kind === "saldo" ? "Entradas" : "vale recebido"}
                    </li>
                  )}
                </ul>
              </section>
            ))}
          </div>

          {hasPending && (
            <p className="rounded-xl border border-border bg-accent/40 px-3 py-2 text-sm text-foreground-secondary">
              {from.month} ainda tem
              {pending.aReceber !== 0 && <> {formatCurrency(pending.aReceber)} a receber</>}
              {pending.aReceber !== 0 && pending.aPagar !== 0 && " e"}
              {pending.aPagar !== 0 && <> {formatCurrency(pending.aPagar)} a pagar</>}. O valor transferido é o saldo atual, sem esses itens.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={applying} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={applying} onClick={apply}>
              {applying ? "Transferindo…" : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
