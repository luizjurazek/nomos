import { toNumber } from "../format/currency";
import { parseInstallment } from "../format/installment";
import { locateTables } from "../sheets/locateTables";
import { extractRawRows } from "../sheets/rowExtraction";
import { CARD_ROLLOVER_CATEGORY, TABLE_CONFIGS } from "../sheets/tableConfigs";
import type { SheetCell, SheetGrid } from "../sheets/types";
import type { AnalysisDebito, AnalysisEntrada, AnalysisMonth, AnalysisNubank } from "./types";

const text = (value: SheetCell | undefined) => String(value ?? "").trim();

/**
 * Turns a month tab's grids into the lean rows the analysis needs. `formatted` is used to find the
 * tables, `raw` (unformatted values) for the actual numbers — same split as the month page uses.
 */
export function parseMonth(year: string, month: string, formatted: SheetGrid, raw: SheetGrid): AnalysisMonth {
  const located = locateTables(formatted);

  const entradas: AnalysisEntrada[] = located.entradas
    ? extractRawRows(raw, located.entradas, TABLE_CONFIGS.entradas.columnOrder).map((row) => {
        const categoria = text(row.values.category);
        const name = text(row.values.name);
        return {
          date: text(row.values.date),
          name,
          categoria,
          valor: toNumber(row.values.valor),
          installment: parseInstallment(name),
          isTransfer: TABLE_CONFIGS.entradas.semanticTags.some((tag) => tag.category === categoria),
        };
      })
    : [];

  const debitos: AnalysisDebito[] = located.debitos
    ? extractRawRows(raw, located.debitos, TABLE_CONFIGS.debitos.columnOrder).map((row) => {
        const categoria = text(row.values.category);
        const name = text(row.values.name);
        return {
          date: text(row.values.date),
          name,
          categoria,
          valor: toNumber(row.values.valor),
          installment: parseInstallment(name),
          isTransfer: TABLE_CONFIGS.debitos.semanticTags.some((tag) => tag.category === categoria),
          isCardRollover: categoria === CARD_ROLLOVER_CATEGORY,
        };
      })
    : [];

  const nubank: AnalysisNubank[] = located.nubank
    ? extractRawRows(raw, located.nubank, TABLE_CONFIGS.nubank.columnOrder).map((row) => {
        const name = text(row.values.name);
        return {
          date: text(row.values.date),
          name,
          categoria: text(row.values.category),
          valor: toNumber(row.values.valor),
          installment: parseInstallment(name),
        };
      })
    : [];

  return { year, month, entradas, debitos, nubank };
}
