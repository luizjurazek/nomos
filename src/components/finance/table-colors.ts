import type { TableId } from "@/lib/sheets/types";

/** Matches the header colors used in the original Google Sheet (Entradas=blue, Débitos=red, Vale Alimentação=coral, Nubank=purple). */
export const TABLE_HEADER_COLORS: Record<TableId, string> = {
  entradas: "#4a86e8",
  debitos: "#e01f1f",
  valeAlimentacaoCredito: "#e06666",
  valeAlimentacaoConsumo: "#e06666",
  nubank: "#8e7cc3",
};
