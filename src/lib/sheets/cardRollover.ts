import "server-only";
import { fetchMonthGrids } from "./gridIO";
import { getMonthNumber, getPreviousMonthRef, listMonths } from "./listMonths";
import { locateTables } from "./locateTables";
import { extractRawRows } from "./rowExtraction";
import { getSpreadsheetId } from "./spreadsheetRegistry";
import {
  CARD_ROLLOVER_CATEGORY,
  CARD_ROLLOVER_DEFAULT_NAME,
  CARD_ROLLOVER_DEFAULT_QUEM,
  TABLE_CONFIGS,
} from "./tableConfigs";
import { createRow, updateCell } from "./writeRow";
import { toNumber } from "../format/currency";
import { UNKNOWN_DAY_PLACEHOLDER } from "../format/date";

/** Sums the previous month's Nubank table, resolving across a year boundary when needed (Janeiro looks at the prior year's spreadsheet). Returns null when there's no previous month to roll over from (e.g. the first migrated month, or the previous spreadsheet/tab doesn't exist yet). */
async function sumPreviousMonthNubank(year: string, monthTitle: string): Promise<number | null> {
  const previous = getPreviousMonthRef(year, monthTitle);
  if (!previous) return null;

  let previousSpreadsheetId: string;
  try {
    previousSpreadsheetId = getSpreadsheetId(previous.year);
  } catch {
    return null;
  }

  const previousMonths = await listMonths(previousSpreadsheetId);
  if (!previousMonths.includes(previous.month)) return null;

  const { formatted, raw } = await fetchMonthGrids(previousSpreadsheetId, previous.month);
  const located = locateTables(formatted);
  if (!located.nubank) return null;

  const rows = extractRawRows(raw, located.nubank, TABLE_CONFIGS.nubank.columnOrder);
  return rows.reduce((acc, row) => acc + toNumber(row.values.valor), 0);
}

/**
 * Keeps the "Cartão de crédito" line in a month's Débitos table synced with the sum of the
 * previous month's Nubank purchases. Idempotent and safe to call often: no-ops when the value
 * already matches, updates just the Valor cell when the row exists but is stale, and creates
 * the row (via the normal createRow slot-or-insert logic) when it's missing entirely.
 * Resolves to true when it wrote to the sheet, so callers only refresh the UI when something changed.
 * This is a write: never call it while rendering a page, only from an explicit action.
 */
export async function syncCardRollover(spreadsheetId: string, year: string, monthTitle: string): Promise<boolean> {
  const previousTotal = await sumPreviousMonthNubank(year, monthTitle);
  if (previousTotal === null) return false;

  const { formatted, raw } = await fetchMonthGrids(spreadsheetId, monthTitle);
  const located = locateTables(formatted);
  if (!located.debitos) return false;

  const debitoRows = extractRawRows(raw, located.debitos, TABLE_CONFIGS.debitos.columnOrder);
  const existing = debitoRows.find(
    (row) => String(row.values.category ?? "").trim() === CARD_ROLLOVER_CATEGORY,
  );

  const roundedTotal = Math.round(previousTotal * 100) / 100;

  if (existing) {
    const currentValue = Math.round(toNumber(existing.values.valor) * 100) / 100;
    if (currentValue !== roundedTotal) {
      await updateCell(spreadsheetId, monthTitle, "debitos", existing.rowIndex, "valor", roundedTotal);
      return true;
    }
    return false;
  }

  await createRow(spreadsheetId, monthTitle, "debitos", {
    date: `${UNKNOWN_DAY_PLACEHOLDER}/${getMonthNumber(monthTitle)}/${year}`,
    name: CARD_ROLLOVER_DEFAULT_NAME,
    category: CARD_ROLLOVER_CATEGORY,
    quem: CARD_ROLLOVER_DEFAULT_QUEM,
    valor: roundedTotal,
    checkbox: false,
  });
  return true;
}
