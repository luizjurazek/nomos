const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/** Copy of `values` in pt-BR alphabetical order: accents and case don't split "Água" from "agua" or push it to the end. */
export function sortAlphabetically(values: readonly string[]): string[] {
  return [...values].sort(collator.compare);
}
