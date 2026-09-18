/** CSS color for the i-th category of a stacked chart (the palette lives in globals.css as --cat-1…6). */
export function categoryColor(index: number, isOther: boolean): string {
  return isOther ? "var(--cat-other)" : `var(--cat-${Math.min(index, 5) + 1})`;
}

/** The five heat map steps for a kind, lowest to highest value (defined in globals.css). */
export function heatColor(kind: "saidas" | "entradas", step: number): string {
  return `var(--heat-${kind === "saidas" ? "red" : "blue"}-${step})`;
}

export function heatTextColor(step: number): string {
  return `var(--heat-text-${step})`;
}
