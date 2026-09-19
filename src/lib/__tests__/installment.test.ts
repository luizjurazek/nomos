import { describe, expect, it } from "vitest";
import { parseInstallment } from "../format/installment";
import { bumpInstallmentName, pendingInstallments, shiftSheetDate, type CarryRow } from "../sheets/carryOver";

describe("parseInstallment", () => {
  it("parses a plain suffix", () => {
    expect(parseInstallment("Ordini 7/10")).toEqual({ current: 7, total: 10 });
  });

  it("parses a parenthesized suffix", () => {
    expect(parseInstallment("Amazon - Fone Jéssica (3/3)")).toEqual({ current: 3, total: 3 });
  });

  it("parses a prefix form", () => {
    expect(parseInstallment("49/58 Carro")).toEqual({ current: 49, total: 58 });
  });

  it("returns null when there's no installment marker", () => {
    expect(parseInstallment("Google Drive")).toBeNull();
  });

  it("rejects an implausible match where current exceeds total", () => {
    expect(parseInstallment("Item 9/3")).toBeNull();
  });
});

describe("carrying installments into the next month", () => {
  const row = (name: string, current: number, total: number, extra: Partial<CarryRow> = {}): CarryRow => ({
    name,
    valor: 700,
    categoria: "Carro",
    quem: "Luiz",
    date: "10/12/2026",
    installment: { current, total },
    ...extra,
  });
  const janeiro = { year: "2027", month: "Janeiro" };

  it("bumps only the digits, whatever the marker's form", () => {
    expect(bumpInstallmentName("Carro 47/58", 48)).toBe("Carro 48/58");
    expect(bumpInstallmentName("Fone (2/3)", 3)).toBe("Fone (3/3)");
    expect(bumpInstallmentName("47/58 Carro", 48)).toBe("48/58 Carro");
    expect(bumpInstallmentName("Empréstimo 3 / 20", 4)).toBe("Empréstimo 4 / 20");
  });

  it("moves the date into the target month, clamping the day and keeping the placeholder", () => {
    expect(shiftSheetDate("10/12/2026", "2027", "Janeiro")).toBe("10/01/2027");
    expect(shiftSheetDate("31/01/2027", "2027", "Fevereiro")).toBe("28/02/2027");
    expect(shiftSheetDate("xx/12/2026", "2027", "Janeiro")).toBe("xx/01/2027");
    expect(shiftSheetDate("", "2027", "Janeiro")).toBe("xx/01/2027");
  });

  it("creates the next installment across the year boundary, unchecked and with the same value", () => {
    const [item] = pendingInstallments("debitos", [row("47/58 Carro", 47, 58)], [], janeiro);
    expect(item).toMatchObject({ tableId: "debitos", name: "48/58 Carro", current: 48, total: 58, valor: 700 });
    expect(item.values).toEqual({ date: "10/01/2027", name: "48/58 Carro", category: "Carro", quem: "Luiz", valor: 700, checkbox: false });
  });

  it("skips plans that already ended, rows without a marker and the synced card line", () => {
    const source = [row("Fone 3/3", 3, 3), row("Mercado", 1, 1, { installment: null }), row("Nubank", 1, 5, { isCardRollover: true })];
    expect(pendingInstallments("debitos", source, [], janeiro)).toEqual([]);
  });

  it("does not duplicate a plan the target already has, even typed by hand with another value", () => {
    const target = [row("Carro 48/58", 48, 58, { valor: 750 })];
    expect(pendingInstallments("debitos", [row("Carro 47/58", 47, 58)], target, janeiro)).toEqual([]);
  });

  it("tells two plans with the same name apart by their total", () => {
    const source = [row("Tênis 1/3", 1, 3), row("Tênis 1/6", 1, 6)];
    const target = [row("Tênis 2/3", 2, 3)];
    expect(pendingInstallments("nubank", source, target, janeiro).map((item) => item.name)).toEqual(["Tênis 2/6"]);
  });
});
