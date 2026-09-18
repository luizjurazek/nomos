import type { ColumnRole, SemanticTag, TableId } from "./types";

export interface TableTypeConfig {
  id: TableId;
  label: string;
  /** Matches the row-1 block title text; null when the table reuses another block's columns (Vale Alimentação). */
  titleMatch: ((cellText: string) => boolean) | null;
  /** Header labels expected, in column order, used to locate the header row via text match. */
  headerLabels: string[];
  columnOrder: ColumnRole[];
  hasOwnHeaderRow: boolean;
  /** Prefixes (case-insensitive) that mark the end of this table's data range, in the order they're expected to appear. */
  totalRowPrefixes: string[];
  categoryListKey: "Entradas" | "Saidas" | null;
  installmentParsing: boolean;
  semanticTags: { category: string; tag: SemanticTag }[];
  /** Label for the checkbox column, e.g. "Recebido" vs "Pago" — null when the table has no checkbox. */
  checkboxLabel: string | null;
}

const norm = (s: string) => s.trim().toLowerCase();

export const TABLE_CONFIGS: Record<TableId, TableTypeConfig> = {
  entradas: {
    id: "entradas",
    label: "Entradas",
    titleMatch: (cellText) => norm(cellText) === "entradas",
    headerLabels: ["Data", "Nome", "Categoria", "Valor", "Recebido"],
    columnOrder: ["date", "name", "category", "valor", "checkbox"],
    hasOwnHeaderRow: true,
    totalRowPrefixes: ["total recebido", "total previsto"],
    categoryListKey: "Entradas",
    installmentParsing: false,
    semanticTags: [{ category: "Res. Emergência", tag: "transferenciaReserva" }],
    checkboxLabel: "Recebido",
  },
  debitos: {
    id: "debitos",
    label: "Débitos",
    titleMatch: (cellText) => norm(cellText) === "débitos" || norm(cellText) === "debitos",
    headerLabels: ["Data", "Nome", "Categoria", "Quem", "Valor", "Pago"],
    columnOrder: ["date", "name", "category", "quem", "valor", "checkbox"],
    hasOwnHeaderRow: true,
    totalRowPrefixes: ["total pago", "total previsto"],
    categoryListKey: "Saidas",
    installmentParsing: false,
    // Money set aside, not spent: both categories are savings when they show up as a débito.
    semanticTags: [
      { category: "Investimentos", tag: "poupanca" },
      { category: "Res. Emergência", tag: "poupanca" },
    ],
    checkboxLabel: "Pago",
  },
  nubank: {
    id: "nubank",
    label: "Nubank",
    titleMatch: (cellText) => norm(cellText).startsWith("nubank sera pago"),
    headerLabels: ["Data", "Nome", "Categoria", "Quem", "Valor"],
    columnOrder: ["date", "name", "category", "quem", "valor"],
    hasOwnHeaderRow: true,
    totalRowPrefixes: ["total"],
    categoryListKey: "Saidas",
    installmentParsing: true,
    semanticTags: [],
    checkboxLabel: null,
  },
  // Vale Alimentação shares the Entradas column block. The "crédito" rows sit
  // above the header row (no header of their own), the "consumo" rows sit below it.
  valeAlimentacaoCredito: {
    id: "valeAlimentacaoCredito",
    label: "Vale Alimentação - Recebido",
    titleMatch: null,
    headerLabels: [],
    columnOrder: ["date", "name", "quem", "valor", "checkbox"],
    hasOwnHeaderRow: false,
    totalRowPrefixes: [],
    categoryListKey: null,
    installmentParsing: false,
    semanticTags: [],
    checkboxLabel: "Recebido",
  },
  valeAlimentacaoConsumo: {
    id: "valeAlimentacaoConsumo",
    label: "Vale Alimentação - Gastos",
    titleMatch: null,
    headerLabels: ["Data", "Nome", "Quem", "Valor", "Pago"],
    columnOrder: ["date", "name", "quem", "valor", "checkbox"],
    hasOwnHeaderRow: true,
    totalRowPrefixes: ["total"],
    categoryListKey: null,
    installmentParsing: false,
    semanticTags: [],
    checkboxLabel: "Pago",
  },
};

export const CARD_ROLLOVER_CATEGORY = "Cartão de crédito";
export const CARD_ROLLOVER_DEFAULT_NAME = "Nubank";
export const CARD_ROLLOVER_DEFAULT_QUEM: string = "Luiz e Jéssica";
