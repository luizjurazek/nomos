const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number): string {
  return formatter.format(value);
}

/** Coerces a raw Sheets cell (already numeric under UNFORMATTED_VALUE reads) into a safe number. */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
