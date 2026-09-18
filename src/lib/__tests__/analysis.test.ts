import { describe, expect, it } from "vitest";
import { categoryBreakdown, categorySeries } from "../analysis/categories";
import { baseName, freedByMonth, listInstallmentPlans } from "../analysis/installments";
import { addMonths, monthKey, refFromKey } from "../analysis/months";
import { parseMonth } from "../analysis/parseMonth";
import { buildTimeline, pickReferenceMonth, summarizePeriod } from "../analysis/timeline";
import type { AnalysisDebito, AnalysisEntrada, AnalysisMonth, AnalysisNubank } from "../analysis/types";
import type { SheetGrid } from "../sheets/types";
import { TABLE_CONFIGS } from "../sheets/tableConfigs";
import { loadNovembroFixture } from "./locateTables.fixtures";

const entrada = (valor: number, categoria = "Salário", isTransfer = false): AnalysisEntrada => ({
  date: "xx/01/2026",
  name: categoria,
  categoria,
  valor,
  isTransfer,
});

const debito = (valor: number, categoria: string, extra: Partial<AnalysisDebito> = {}): AnalysisDebito => ({
  date: "xx/01/2026",
  name: categoria,
  categoria,
  valor,
  isTransfer: false,
  isCardRollover: false,
  ...extra,
});

const nubank = (valor: number, categoria = "Compras", installment: AnalysisNubank["installment"] = null, name = categoria): AnalysisNubank => ({
  date: "10/01/2026",
  name,
  categoria,
  valor,
  installment,
});

const month = (year: string, name: string, parts: Partial<AnalysisMonth> = {}): AnalysisMonth => ({
  year,
  month: name,
  entradas: [],
  debitos: [],
  nubank: [],
  ...parts,
});

const NOW = { year: 2026, monthIndex: 8 }; // Setembro 2026

describe("month helpers", () => {
  it("adds months across the year boundary", () => {
    expect(addMonths({ year: "2026", month: "Novembro" }, 3)).toEqual({ year: "2027", month: "Fevereiro" });
    expect(addMonths({ year: "2026", month: "Janeiro" }, -1)).toEqual({ year: "2025", month: "Dezembro" });
  });

  it("round-trips a month key", () => {
    expect(monthKey(refFromKey("2026-09"))).toBe("2026-09");
  });
});

describe("buildTimeline", () => {
  const months = [
    month("2026", "Agosto", {
      entradas: [entrada(5000)],
      debitos: [debito(1000, "Moradia")],
      nubank: [nubank(300), nubank(200)],
    }),
    month("2026", "Setembro", {
      entradas: [entrada(5000)],
      // The auto-synced card line must not be counted next to the bill computed from Agosto's Nubank.
      debitos: [debito(1000, "Moradia"), debito(999, "Cartão de crédito", { isCardRollover: true })],
      nubank: [nubank(400, "Compras", { current: 2, total: 4 }, "Sofá 2/4")],
    }),
  ];

  it("pays the card in the month after the purchases and never counts the rollover line twice", () => {
    const points = buildTimeline(months, NOW);
    const setembro = points.find((point) => point.key === "2026-09")!;
    expect(setembro.cartao).toBe(500);
    expect(setembro.debitos).toBe(1000);
    expect(setembro.saldo).toBe(5000 - 1000 - 500);
  });

  it("falls back to the synced rollover line when the previous month has no tab", () => {
    const first = buildTimeline([months[1]], NOW)[0];
    expect(first.cartao).toBe(999);
  });

  it("marks only months after the current one as projected", () => {
    const points = buildTimeline(months, { year: 2026, monthIndex: 7 });
    expect(points.filter((point) => point.source === "sheet").map((point) => point.projected)).toEqual([false, true]);
  });

  it("projects card bills past the last tab from the remaining installments", () => {
    const points = buildTimeline(months, NOW);
    const extra = points.filter((point) => point.source === "installments");
    // Setembro's whole Nubank table (400) is Outubro's bill, then the 2 remaining installments repeat.
    expect(extra.map((point) => [point.key, point.cartao])).toEqual([
      ["2026-10", 400],
      ["2026-11", 400],
      ["2026-12", 400],
    ]);
    expect(extra.every((point) => point.projected && point.saldo === null && point.entradas === null)).toBe(true);
  });

  it("crosses into the next year and stops when the installments end", () => {
    const december = month("2026", "Dezembro", {
      nubank: [nubank(100, "Compras", { current: 1, total: 2 }), nubank(50)],
    });
    const extra = buildTimeline([december], NOW).filter((point) => point.source === "installments");
    expect(extra.map((point) => [point.key, point.cartao])).toEqual([
      ["2027-01", 150],
      ["2027-02", 100],
    ]);
  });

  it("returns nothing without data", () => {
    expect(buildTimeline([], NOW)).toEqual([]);
  });
});

describe("pickReferenceMonth", () => {
  it("prefers the current tab, else the latest one before it", () => {
    const list = [month("2026", "Junho"), month("2026", "Agosto"), month("2026", "Novembro")];
    expect(pickReferenceMonth(list, NOW)?.month).toBe("Agosto");
    expect(pickReferenceMonth([...list, month("2026", "Setembro")], NOW)?.month).toBe("Setembro");
  });

  it("falls back to the first tab when everything is in the future", () => {
    expect(pickReferenceMonth([month("2027", "Março")], NOW)?.month).toBe("Março");
  });
});

describe("summarizePeriod", () => {
  it("ignores card-only projections and finds the tightest month", () => {
    const points = buildTimeline(
      [
        month("2026", "Agosto", { entradas: [entrada(3000)], debitos: [debito(1000, "Moradia")] }),
        month("2026", "Setembro", { entradas: [entrada(3000)], debitos: [debito(2500, "Moradia")] }),
      ],
      NOW,
    );
    const summary = summarizePeriod(points);
    expect(summary.months).toBe(2);
    expect(summary.saldoTotal).toBe(2000 + 500);
    expect(summary.avgEntradas).toBe(3000);
    expect(summary.tightest?.key).toBe("2026-09");
  });
});

describe("categoryBreakdown", () => {
  const months = [
    month("2026", "Agosto", {
      entradas: [entrada(4000, "Salário"), entrada(500, "Res. Emergência", true)],
      debitos: [debito(1000, "Moradia"), debito(200, "Lazer")],
      nubank: [nubank(300, "Compras"), nubank(100, "")],
    }),
    month("2026", "Setembro", {
      entradas: [entrada(4000, "Salário")],
      debitos: [
        debito(1000, "Moradia"),
        debito(500, "Investimentos", { isTransfer: true }),
        debito(777, "Cartão de crédito", { isCardRollover: true }),
      ],
      nubank: [],
    }),
  ];

  it("adds last month's Nubank purchases to this month's cash-out and drops the rollover line", () => {
    const { total, rows } = categoryBreakdown(months, "2026-09", { kind: "saidas", includeTransfers: false });
    expect(total).toBe(1000 + 300 + 100);
    expect(rows.map((row) => [row.categoria, row.total])).toEqual([
      ["Moradia", 1000],
      ["Compras", 300],
      ["Sem categoria", 100],
    ]);
  });

  it("leaves transfers out unless asked", () => {
    const withTransfers = categoryBreakdown(months, "2026-09", { kind: "saidas", includeTransfers: true });
    expect(withTransfers.rows.find((row) => row.categoria === "Investimentos")?.total).toBe(500);
    const entradas = categoryBreakdown(months, "2026-08", { kind: "entradas", includeTransfers: false });
    expect(entradas.rows.map((row) => row.categoria)).toEqual(["Salário"]);
  });

  it("compares with the previous month and leaves the delta empty for new categories", () => {
    const { rows } = categoryBreakdown(months, "2026-09", { kind: "saidas", includeTransfers: false });
    // Moradia: 1000 now vs 1000 in Agosto (no Nubank from Julho).
    expect(rows.find((row) => row.categoria === "Moradia")?.delta).toBe(0);
    expect(rows.find((row) => row.categoria === "Compras")?.delta).toBeNull();
  });

  it("has no deltas when the previous month is missing", () => {
    const { rows } = categoryBreakdown([months[1]], "2026-09", { kind: "saidas", includeTransfers: false });
    expect(rows.every((row) => row.delta === null)).toBe(true);
  });

  it("builds one category's series across the months", () => {
    const series = categorySeries(months, "Moradia", { kind: "saidas", includeTransfers: false });
    expect(series.map((point) => point.total)).toEqual([1000, 1000]);
  });
});

describe("installments", () => {
  it("strips the marker from the name", () => {
    expect(baseName("Tênis Ana - Loja Exemplo 5/6")).toBe("Tênis Ana - Loja Exemplo");
    expect(baseName("Loja Exemplo - Fone Ana (3/3)")).toBe("Loja Exemplo - Fone Ana");
    expect(baseName("49/58 Carro")).toBe("Carro");
  });

  it("finds the last bill and the month the bill drops", () => {
    const september = month("2026", "Setembro", {
      nubank: [
        nubank(100, "Compras", { current: 3, total: 4 }, "Sofá 3/4"),
        nubank(60, "Compras", { current: 1, total: 1 }, "Fone 1/1"),
        nubank(40, "Assinaturas"),
      ],
    });
    const plans = listInstallmentPlans(september);
    // Fone: charged in Setembro's table, paid in Outubro (its last bill), gone from Novembro's bill.
    expect(plans.map((plan) => [plan.name, monthKey(plan.lastBill), monthKey(plan.freedIn)])).toEqual([
      ["Fone", "2026-10", "2026-11"],
      ["Sofá", "2026-11", "2026-12"],
    ]);
    expect(freedByMonth(plans).map((item) => [item.key, item.amount])).toEqual([
      ["2026-11", 60],
      ["2026-12", 100],
    ]);
  });
});

describe("parseMonth against the Novembro export", () => {
  const formatted = loadNovembroFixture();
  // The export only has formatted text, so fake the unformatted read: "R$ 1.340,11" -> 1340.11, "FALSE" -> false.
  const raw: SheetGrid = formatted.map((row) =>
    row.map((cell) => {
      if (typeof cell !== "string") return cell;
      if (/^R\$ [\d.]+,\d{2}$/.test(cell)) return Number(cell.replace("R$ ", "").replace(/\./g, "").replace(",", "."));
      if (cell === "FALSE" || cell === "TRUE") return cell === "TRUE";
      return cell;
    }),
  );
  const parsed = parseMonth("2026", "Novembro", formatted, raw);

  it("reads the three tables with their amounts", () => {
    expect(parsed.entradas.map((row) => row.name)).toEqual(["Salário Marcos", "Salário Ana", "Empréstimo Exemplo 5/20"]);
    expect(parsed.entradas.reduce((acc, row) => acc + row.valor, 0)).toBeCloseTo(9800);
    // Sum of the 14 rows; the export's own "Total" cell (875,36) is an anonymization artifact and doesn't match them.
    expect(parsed.nubank).toHaveLength(14);
    expect(parsed.nubank.reduce((acc, row) => acc + row.valor, 0)).toBeCloseTo(882.81, 2);
  });

  it("flags the card line and the investment transfers in Débitos", () => {
    expect(parsed.debitos.filter((row) => row.isCardRollover).map((row) => row.valor)).toEqual([1340.11]);
    expect(parsed.debitos.filter((row) => row.isTransfer).map((row) => row.name)).toEqual([
      "Reserva de emergência",
      "Compras futuras",
      "Investimentos",
    ]);
  });

  it("parses installments in the Nubank table", () => {
    const tenis = parsed.nubank.find((row) => row.name.startsWith("Tênis"));
    expect(tenis?.installment).toEqual({ current: 5, total: 6 });
    expect(parsed.nubank.find((row) => row.name === "Serviço de nuvem")?.installment).toBeNull();
  });
});

describe("savings classification", () => {
  it("treats Res. Emergência and Investimentos as poupança in Débitos, but keeps the Entradas withdrawal separate", () => {
    const debitoTags = TABLE_CONFIGS.debitos.semanticTags;
    expect(debitoTags).toContainEqual({ category: "Investimentos", tag: "poupanca" });
    expect(debitoTags).toContainEqual({ category: "Res. Emergência", tag: "poupanca" });
    expect(TABLE_CONFIGS.entradas.semanticTags).toEqual([{ category: "Res. Emergência", tag: "transferenciaReserva" }]);
  });
});
