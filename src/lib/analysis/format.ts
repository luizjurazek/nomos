const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.340,50" — with cents, for tables, readouts and lists. */
export function formatBRL(value: number): string {
  return brl.format(value);
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

export interface Delta {
  /** Signed difference, e.g. "+R$ 500,00" / "−R$ 120,00" / "R$ 0,00". */
  abs: string;
  /** Signed change relative to the reference, e.g. "+12%"; null when the reference is 0 (no meaningful ratio). */
  pct: string | null;
  direction: "up" | "down" | "flat";
}

/** How `current` moved compared to `reference`; null when either value is unknown. */
export function formatDelta(current: number | null, reference: number | null): Delta | null {
  if (current === null || reference === null) return null;
  // Work in whole cents so float noise (0.1 + 0.2) never shows up as a fake difference.
  const diff = (Math.round(current * 100) - Math.round(reference * 100)) / 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const abs = `${sign}${formatBRL(Math.abs(diff))}`;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  if (reference === 0) return { abs, pct: null, direction };
  const pct = Math.round((Math.abs(current - reference) / Math.abs(reference)) * 100);
  return { abs, pct: pct === 0 ? "0%" : `${sign}${pct}%`, direction };
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
