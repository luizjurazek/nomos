import "server-only";
import { getSheetsClient } from "./client";
import { quoteSheetTitle } from "./gridIO";
import type { Categories } from "./types";

const DADOS_TAB = "Dados";
const DADOS_RANGE = "A1:B200";

/** Reads the "Dados" tab's two category columns (Entradas / Saidas), used to populate category dropdowns. */
export async function getCategories(spreadsheetId: string): Promise<Categories> {
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
