import "server-only";
import { unstable_cache } from "next/cache";
import { getSpreadsheetId, listAvailableYears } from "../sheets/spreadsheetRegistry";
import { readYear } from "./readYear";
import type { AnalysisMonth } from "./types";

/** Cache tag dropped by the "Atualizar" button on the analysis page. */
export const ANALYSIS_CACHE_TAG = "analise";

/**
 * Every month of every configured year, oldest first. Cached for a minute: the analysis reads whole
 * spreadsheets and the Sheets API quota is limited. Writes made on the month pages do not invalidate
 * this cache (that code is left untouched), so the numbers can lag by up to that minute, or until
 * someone taps "Atualizar".
 */
export const readAllYears = unstable_cache(
  async (): Promise<AnalysisMonth[]> => {
    const years = listAvailableYears();
    const perYear = await Promise.all(years.map((year) => readYear(getSpreadsheetId(year), year)));
    return perYear.flat();
  },
  ["analise-all-years"],
  { tags: [ANALYSIS_CACHE_TAG], revalidate: 60 },
);
