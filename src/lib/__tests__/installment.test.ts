import { describe, expect, it } from "vitest";
import { parseInstallment } from "../format/installment";

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
