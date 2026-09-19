import { describe, expect, it } from "vitest";
import { categoryBreakdown, categoryBreakdownForPeriod, categoryMatrix, categorySeries, pieSlices } from "../analysis/categories";
import { baseName, freedByMonth, installmentsByBill, listInstallmentPlans, summarizePlans, upcomingBills, withTrailingDrops } from "../analysis/installments";
import { addMonths, monthKey, refFromKey } from "../analysis/months";
import { parseMonth } from "../analysis/parseMonth";
import { monthDataNet, summarizeSavings } from "../analysis/savings";
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

describe("pieSlices", () => {
  const rows = [400, 300, 100, 80, 60, 40, 15, 5].map((total, index) => ({ categoria: `C${index + 1}`, total }));

  it("keeps the top categories and groups the rest as Outras", () => {
    const slices = pieSlices(rows);
    expect(slices.map((slice) => slice.categoria)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "Outras"]);
    expect(slices.at(-1)).toMatchObject({ total: 20, isOther: true });
    expect(slices.reduce((acc, slice) => acc + slice.share, 0)).toBeCloseTo(1);
  });

  it("ignores non-positive totals and handles an empty list", () => {
    expect(pieSlices([{ categoria: "A", total: 0 }, { categoria: "B", total: -5 }])).toEqual([]);
    expect(pieSlices([{ categoria: "A", total: 50 }, { categoria: "B", total: -5 }])).toEqual([
      { categoria: "A", total: 50, share: 1, isOther: false },
    ]);
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
    expect(freedByMonth(plans).map((item) => item.names)).toEqual([["Fone"], ["Sofá"]]);
  });

  it("adds up installments per bill and over all plans", () => {
    const september = month("2026", "Setembro", {
      nubank: [nubank(100, "Compras", { current: 3, total: 4 }, "Sofá 3/4"), nubank(60, "Compras", { current: 1, total: 2 }, "Fone 1/2")],
    });
    const plans = listInstallmentPlans(september);
    // Sofá is in Setembro's bill (charge 2), Outubro's and Novembro's; Fone starts in Outubro and ends in Novembro.
    expect([...installmentsByBill(plans)].sort()).toEqual([
      ["2026-09", 100],
      ["2026-10", 160],
      ["2026-11", 160],
    ]);
    expect(summarizePlans(plans)).toEqual({ count: 2, paid: 200, remaining: 320, total: 520 });
  });

  it("adds the month the last bill drops as a regular row", () => {
    const points = buildTimeline([month("2026", "Setembro", { nubank: [nubank(100, "Compras", { current: 3, total: 4 }, "Sofá 3/4")] })], NOW);
    const bills = points.filter((point) => point.source === "installments");
    const freed = freedByMonth(listInstallmentPlans(month("2026", "Setembro", { nubank: [nubank(100, "Compras", { current: 3, total: 4 }, "Sofá 3/4")] })));
    const extended = withTrailingDrops(bills, freed);
    expect(extended.map((point) => [point.key, point.cartao])).toEqual([
      ["2026-10", 100],
      ["2026-11", 100],
      ["2026-12", 0],
    ]);
  });

  it("lists every projected bill plus the drop, even with more months than the minimum", () => {
    const september = month("2026", "Setembro", { nubank: [nubank(100, "Compras", { current: 1, total: 9 }, "Sofá 1/9")] });
    const points = buildTimeline([september], NOW);
    const freed = freedByMonth(listInstallmentPlans(september));
    // Bills go from Outubro to Junho (9 charges); the bill only drops in Julho, which has no point of its own.
    const bills = upcomingBills(points, "2026-10", freed, 3);
    expect(bills.map((point) => point.key).at(-1)).toBe(monthKey(freed[0].ref));
    expect(bills.at(-1)?.cartao).toBe(0);
    expect(bills).toHaveLength(9 + 1);
  });

  it("splits an installment into what is paid, what is left and the total", () => {
    // 3/4 in Setembro's table: 2 bills already paid, the 3rd goes into Outubro's bill, the 4th into Novembro's.
    const september = month("2026", "Setembro", { nubank: [nubank(99.9, "Compras", { current: 3, total: 4 }, "Sofá 3/4")] });
    const [plan] = listInstallmentPlans(september);
    expect([plan.paidCount, plan.remainingCount]).toEqual([2, 2]);
    expect(plan.paidAmount).toBeCloseTo(199.8);
    expect(plan.remainingAmount).toBeCloseTo(199.8);
    expect(plan.totalAmount).toBeCloseTo(399.6);
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

describe("savings (poupado)", () => {
  const months = [
    month("2026", "Agosto", {
      entradas: [entrada(5000), entrada(300, "Res. Emergência", true)],
      debitos: [
        debito(1000, "Moradia"),
        debito(400, "Investimentos", { isTransfer: true }),
        debito(200, "Res. Emergência", { isTransfer: true }),
      ],
    }),
    month("2026", "Setembro", {
      entradas: [entrada(5000)],
      debitos: [debito(1000, "Moradia"), debito(500, "Investimentos", { isTransfer: true })],
    }),
  ];

  it("counts the savings categories as poupado and takes reserve withdrawals off", () => {
    const [agosto, setembro] = buildTimeline(months, NOW);
    expect(agosto.aportes).toBe(600);
    expect(agosto.retiradas).toBe(300);
    expect(agosto.poupado).toBe(300);
    expect(setembro.poupado).toBe(500);
  });

  it("does not change the saldo, which still treats savings as an outflow like the sheet", () => {
    const [agosto] = buildTimeline(months, NOW);
    // Entradas (5300, reserve withdrawal included) − Débitos (1600, savings included) − card bill (0).
    expect(agosto.saldo).toBe(5300 - 1600);
  });

  it("leaves poupado empty past the last tab", () => {
    const december = month("2026", "Dezembro", { nubank: [nubank(100)] });
    const extra = buildTimeline([december], NOW).filter((point) => point.source === "installments");
    expect(extra.every((point) => point.poupado === null && point.aportes === null)).toBe(true);
  });

  it("sums the period and gives the rate over real income (reserve withdrawals aren't income)", () => {
    const summary = summarizePeriod(buildTimeline(months, NOW));
    expect(summary.aportesTotal).toBe(1100);
    expect(summary.retiradasTotal).toBe(300);
    expect(summary.poupadoTotal).toBe(800);
    // Real income: (5300 + 5000) − 300 = 10000.
    expect(summary.poupadoRate).toBeCloseTo(0.08);
  });

  it("has no rate without income", () => {
    expect(summarizePeriod(buildTimeline([month("2026", "Agosto")], NOW)).poupadoRate).toBeNull();
  });
});

describe("summarizeSavings", () => {
  const history = [
    month("2026", "Junho", { debitos: [debito(300, "Investimentos", { isTransfer: true })] }),
    month("2026", "Julho", {
      entradas: [entrada(100, "Res. Emergência", true)],
      debitos: [debito(400, "Investimentos", { isTransfer: true })],
    }),
    month("2026", "Agosto", { debitos: [debito(200, "Investimentos", { isTransfer: true })] }),
    month("2026", "Setembro", { debitos: [debito(999, "Investimentos", { isTransfer: true })] }),
    month("2026", "Outubro", { debitos: [debito(500, "Investimentos", { isTransfer: true })] }),
  ];
  const at = (name: string) => ({ year: "2026", month: name });

  it("adds the earlier months to the fresh value of the viewed month, withdrawals included", () => {
    // Junho 300 + Julho (400 − 100) + Agosto: the viewed value (250) replaces the cached 200.
    const summary = summarizeSavings(history, at("Agosto"), NOW, 250);
    expect(summary.month).toBe(250);
    expect(summary.total).toBe(300 + 300 + 250);
    expect(summary.through).toEqual(at("Agosto"));
  });

  it("uses the viewed month's fresh number, not the cached one, for the current month", () => {
    expect(summarizeSavings(history, at("Setembro"), NOW, 111).total).toBe(300 + 300 + 200 + 111);
  });

  it("never counts months after the current one, and takes the current month from the history", () => {
    const summary = summarizeSavings(history, at("Outubro"), NOW, 500);
    expect(summary.month).toBe(500);
    expect(summary.through).toEqual(at("Setembro"));
    expect(summary.total).toBe(300 + 300 + 200 + 999);
  });

  it("has no total when the history could not be read", () => {
    const summary = summarizeSavings(null, at("Setembro"), NOW, 42);
    expect(summary).toEqual({ month: 42, total: null, through: at("Setembro") });
  });
});

describe("monthDataNet", () => {
  it("nets poupança débitos against reserve withdrawals from a month page's data", () => {
    const net = monthDataNet({
      debitos: [
        { valor: 500, isPoupanca: true },
        { valor: 900, isPoupanca: false },
      ],
      entradas: [{ valor: 120, isReservaWithdrawal: true }],
    } as never);
    expect(net).toBe(380);
  });
});

describe("savings categories in the breakdown", () => {
  const months = [
    month("2026", "Agosto", { debitos: [debito(200, "Moradia"), debito(300, "Investimentos", { isTransfer: true })] }),
    month("2026", "Setembro", {
      debitos: [
        debito(200, "Moradia"),
        debito(500, "Investimentos", { isTransfer: true }),
        debito(100, "Res. Emergência", { isTransfer: true }),
      ],
    }),
  ];

  it("flags savings categories and their comparison with the month before", () => {
    const { rows } = categoryBreakdown(months, "2026-09", { kind: "saidas", includeTransfers: true });
    const byName = Object.fromEntries(rows.map((row) => [row.categoria, row]));
    expect(byName["Investimentos"].isSavings).toBe(true);
    expect(byName["Investimentos"].delta).toBeCloseTo(500 / 300 - 1);
    expect(byName["Res. Emergência"].isSavings).toBe(true);
    expect(byName["Moradia"].isSavings).toBe(false);
  });

  it("never flags entradas categories as savings", () => {
    const withReserve = [month("2026", "Setembro", { entradas: [entrada(300, "Res. Emergência", true)] })];
    const { rows } = categoryBreakdown(withReserve, "2026-09", { kind: "entradas", includeTransfers: true });
    expect(rows.every((row) => !row.isSavings)).toBe(true);
  });
});

describe("period category views", () => {
  const months = [
    month("2026", "Julho", { nubank: [nubank(100, "Compras"), nubank(50, "Lazer")] }),
    month("2026", "Agosto", {
      debitos: [debito(1000, "Moradia"), debito(300, "Investimentos", { isTransfer: true }), debito(80, "Cartão de crédito", { isCardRollover: true })],
      nubank: [nubank(200, "Compras")],
    }),
    month("2026", "Setembro", {
      debitos: [debito(1000, "Moradia"), debito(500, "Investimentos", { isTransfer: true }), debito(10, "Café")],
      nubank: [],
    }),
  ];
  const keys = ["2026-07", "2026-08", "2026-09"];
  const opts = { kind: "saidas" as const, includeTransfers: true };

  it("sums the months of the period, counting each month's card bill from the month before", () => {
    const period = categoryBreakdownForPeriod(months, keys, opts);
    // Agosto pays Julho's Nubank (100 + 50), Setembro pays Agosto's (200).
    expect(Object.fromEntries(period.rows.map((row) => [row.categoria, row.total]))).toEqual({
      Moradia: 2000,
      Investimentos: 800,
      Compras: 300,
      Lazer: 50,
      Café: 10,
    });
    expect(period.total).toBe(3160);
    expect(period.monthsCount).toBe(3);
    expect(period.rows.find((row) => row.categoria === "Moradia")?.average).toBeCloseTo(2000 / 3);
    expect(period.rows.find((row) => row.categoria === "Investimentos")?.isSavings).toBe(true);
  });

  it("leaves transfers out unless asked and ignores months without a tab", () => {
    const withoutTransfers = categoryBreakdownForPeriod(months, [...keys, "2026-10"], { ...opts, includeTransfers: false });
    expect(withoutTransfers.rows.some((row) => row.categoria === "Investimentos")).toBe(false);
    expect(withoutTransfers.monthsCount).toBe(3);
  });

  it("has an empty breakdown for an empty period", () => {
    expect(categoryBreakdownForPeriod(months, [], opts)).toEqual({ total: 0, monthsCount: 0, rows: [] });
  });

  it("builds the category x month matrix with totals per row and per column", () => {
    const matrix = categoryMatrix(months, keys, opts, 10);
    expect(matrix.keys).toEqual(keys);
    const moradia = matrix.categories.find((category) => category.categoria === "Moradia")!;
    expect(moradia.totals).toEqual([0, 1000, 1000]);
    expect(moradia.total).toBe(2000);
    expect(matrix.monthTotals).toEqual([0, 1000 + 300 + 150, 1000 + 500 + 10 + 200]);
    expect(matrix.total).toBe(3160);
  });

  it("groups everything past topN as Outras, last, keeping the totals intact", () => {
    const matrix = categoryMatrix(months, keys, opts, 2);
    expect(matrix.categories.map((category) => category.categoria)).toEqual(["Moradia", "Investimentos", "Outras"]);
    const others = matrix.categories.at(-1)!;
    expect(others.isOther).toBe(true);
    expect(others.total).toBe(300 + 50 + 10);
    expect(matrix.categories.reduce((acc, category) => acc + category.total, 0)).toBe(matrix.total);
  });

  it("has no Outras bucket when everything fits", () => {
    expect(categoryMatrix(months, keys, opts, 10).categories.some((category) => category.isOther)).toBe(false);
  });
});
