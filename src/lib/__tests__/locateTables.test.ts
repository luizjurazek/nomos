import { describe, expect, it } from "vitest";
import { locateTables } from "../sheets/locateTables";
import { loadNovembroFixture } from "./locateTables.fixtures";

describe("locateTables against the real Novembro export", () => {
  const grid = loadNovembroFixture();
  const located = locateTables(grid);

  it("finds the Nubank block at column P (index 15), not Q", () => {
    expect(located.nubank?.startCol).toBe(15);
  });

  it("finds the Entradas block at column C (index 2) and Débitos at column I (index 8)", () => {
    expect(located.entradas?.startCol).toBe(2);
    expect(located.debitos?.startCol).toBe(8);
  });

  it("locates header rows right below the row-1 titles", () => {
    expect(located.entradas?.headerRow).toBe(1);
    expect(located.debitos?.headerRow).toBe(1);
    expect(located.nubank?.headerRow).toBe(1);
  });

  it("finds two consecutive total rows for Entradas and Débitos", () => {
    expect(located.entradas?.totalRows.map((t) => t.label)).toEqual(["Total recebido", "Total previsto"]);
    expect(located.debitos?.totalRows.map((t) => t.label)).toEqual(["Total pago", "Total previsto"]);
  });

  it("locates the Vale Alimentação credit rows above the Vale Alimentação header, in the Entradas columns", () => {
    const credito = located.valeAlimentacaoCredito;
    const consumo = located.valeAlimentacaoConsumo;
    expect(credito).toBeDefined();
    expect(consumo).toBeDefined();
    expect(credito!.startCol).toBe(located.entradas?.startCol);
    expect(credito!.dataEndRow).toBe(consumo!.headerRow! - 1);
    expect(credito!.dataStartRow).toBeLessThanOrEqual(credito!.dataEndRow);

    // Real data: the two credit rows sit above the "Data,Nome,Quem,Valor,Pago" header.
    const creditoNames = grid
      .slice(credito!.dataStartRow, credito!.dataEndRow + 1)
      .map((row) => row[credito!.startCol + 1]);
    expect(creditoNames).toContain("Vale Marcos");
    expect(creditoNames).toContain("Delivery Ana");
  });

  it("Nubank has no padding and terminates at a single Total row", () => {
    expect(located.nubank?.totalRows.map((t) => t.label)).toEqual(["Total"]);
  });
});
