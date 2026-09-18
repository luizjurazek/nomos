"use client";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format/currency";

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

/** A pt-BR currency-masked input: the user types digits, we render them as "R$ 1.600,00". */
export function CurrencyInput({ id, name, value, onChange, placeholder = "R$ 0,00" }: CurrencyInputProps) {
  const display = value ? formatCurrency(value) : "";

  return (
    <Input
      id={id}
      name={name}
      inputMode="numeric"
      className="h-11 text-base"
      placeholder={placeholder}
      value={display}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "");
        onChange(digits ? Number(digits) / 100 : 0);
      }}
    />
  );
}
