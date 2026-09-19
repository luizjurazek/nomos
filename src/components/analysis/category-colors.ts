/** Number of distinct category colors; later categories reuse the last one. */
export const CATEGORY_COLORS = 12;

/** CSS color for the i-th category of a chart (the palette lives in globals.css as --cat-1…12). */
export function categoryColor(index: number, isOther: boolean): string {
  return isOther ? "var(--cat-other)" : `var(--cat-${Math.min(index, CATEGORY_COLORS - 1) + 1})`;
}

/** The five heat map steps for a kind, lowest to highest value (defined in globals.css). */
export function heatColor(kind: "saidas" | "entradas", step: number): string {
  return `var(--heat-${kind === "saidas" ? "red" : "blue"}-${step})`;
}

export function heatTextColor(step: number): string {
  return `var(--heat-text-${step})`;
}
