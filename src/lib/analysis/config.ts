import "server-only";
import { unstable_cache } from "next/cache";
import { toNumber } from "../format/currency";
import { readConfigRows } from "../sheets/readConfig";
import { getSpreadsheetId, listAvailableYears } from "../sheets/spreadsheetRegistry";
import { ANALYSIS_CACHE_TAG } from "./readAllYears";

const INITIAL_BALANCE_KEY = "saldo inicial da poupança";

/**
 * The savings balance from before this app existed, read from the "Config" tab of the earliest year's
 * spreadsheet (row: "Saldo inicial da poupança" | <valor>). Kept outside every month tab so it never
 * gets attached to, or skews the stats of, any month. 0 when the tab or row doesn't exist yet.
 */
export const getInitialSavingsBalance = unstable_cache(
  async (): Promise<number> => {
    const firstYear = listAvailableYears()[0];
    if (!firstYear) return 0;
    try {
      const rows = await readConfigRows(getSpreadsheetId(firstYear));
      return toNumber(rows.get(INITIAL_BALANCE_KEY));
    } catch {
      return 0;
    }
  },
  ["initial-savings-balance"],
  { tags: [ANALYSIS_CACHE_TAG], revalidate: 60 },
);
