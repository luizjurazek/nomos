const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number): string {
  // Round to cents and add 0 so float residue (-0.0000001) or -0 doesn't render as "-R$ 0,00".
  return formatter.format(Math.round(value * 100) / 100 + 0);
}

/** Coerces a raw Sheets cell (already numeric under UNFORMATTED_VALUE reads) into a safe number. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
