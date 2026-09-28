import "server-only";
import { unstable_cache } from "next/cache";
import { getSheetsClient } from "./client";
import { quoteSheetTitle } from "./gridIO";
import type { Categories } from "./types";

const DADOS_TAB = "Dados";
const DADOS_RANGE = "A1:B200";

/** Cache tag for the category list; dropped by the "Atualizar" button on /analise. */
export const CATEGORIES_CACHE_TAG = "categories";

async function readCategories(spreadsheetId: string): Promise<Categories> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetTitle(DADOS_TAB)}!${DADOS_RANGE}`,
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = response.data.values ?? [];
  const dataRows = rows.slice(1); // skip the "Entradas,Saidas" header row

  const entradas = dataRows
    .map((row) => String(row[0] ?? "").trim())
    .filter((value) => value.length > 0);
  const saidas = dataRows
    .map((row) => String(row[1] ?? "").trim())
    .filter((value) => value.length > 0);

  return { entradas, saidas };
}

/**
 * Reads the "Dados" tab's two category columns (Entradas / Saidas), used to populate category
 * dropdowns. Cached for 5 minutes: this is read on every month-page view, but the category list
 * itself barely ever changes, and the Sheets API read quota is shared by everyone using the app.
 */
export const getCategories = unstable_cache(readCategories, ["categories"], {
  tags: [CATEGORIES_CACHE_TAG],
  revalidate: 300,
});
