"use client";

import { Check } from "lucide-react";

interface StatusPillProps {
  checked: boolean;
  checkedLabel: string;
  uncheckedLabel: string;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

/** Tappable status ("Pago" / "A pagar", "Recebido" / "A receber"): the label says the state, so it never reads as an on/off switch. */
export function StatusPill({ checked, checkedLabel, uncheckedLabel, onToggle, disabled }: StatusPillProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
        checked
          ? "bg-success/12 text-success"
          : "border border-border text-foreground-secondary hover:bg-accent/60"
      }`}
    >
      {checked && <Check className="size-3" />}
      {checked ? checkedLabel : uncheckedLabel}
    </button>
  );
}
