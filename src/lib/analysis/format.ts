const whole = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** "R$ 1.340" — no cents, for tables and dense lists. */
export function formatBRLWhole(value: number): string {
  return whole.format(Math.round(value));
}

/** "R$ 5,2 mil" / "-R$ 800" — for chart axes. */
export function formatAxisBRL(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const thousands = abs / 1000;
    const text = Number.isInteger(thousands) ? String(thousands) : thousands.toFixed(1).replace(".", ",");
    return `${sign}R$ ${text} mil`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** "850", "1,2 mil", "12 mil": short numbers for heat map cells, no currency symbol. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.round(value));
  const thousands = value / 1000;
  const text = Math.abs(thousands) >= 10 ? String(Math.round(thousands)) : thousands.toFixed(1).replace(".", ",").replace(",0", "");
  return `${text} mil`;
}
