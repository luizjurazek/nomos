"use client";

import { PiggyBank } from "lucide-react";

/**
 * One switch for the whole page (lives in the filter sheet): the day to day view (entradas without what came back from the reserve, débitos
 * without what was saved) or the sheet's own totals, savings money included. Every chart, table and card follows it.
 */
export function SavingsToggle({ withSavings, onChange }: { withSavings: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={withSavings}
        onClick={() => onChange(!withSavings)}
        className={`flex min-h-11 items-center gap-1.5 sm:min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
          withSavings ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:bg-accent/60"
        }`}
      >
        <PiggyBank className="size-4" aria-hidden />
        Incluir poupança
      </button>
      <p className="text-xs text-foreground-secondary">
        {withSavings
          ? "Como na planilha: entradas com o que voltou da reserva e débitos com o que foi guardado."
          : "Dia a dia: entradas e débitos sem o que foi guardado nem o que voltou da reserva."}
      </p>
    </div>
  );
}
