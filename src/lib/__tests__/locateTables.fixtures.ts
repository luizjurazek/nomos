import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SheetGrid } from "../sheets/types";
import { parseCsv } from "./csv";

/** Loads the "Novembro" month export (names/amounts anonymized, structure identical to the real sheet) as a grid, for testing `locateTables` against actual sheet structure. */
export function loadNovembroFixture(): SheetGrid {
  const path = join(process.cwd(), "reference", "Controle financeiro casal - 2026 - Novembro.csv");
  const text = readFileSync(path, "utf-8");
  return parseCsv(text);
}
