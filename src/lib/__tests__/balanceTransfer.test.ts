import { describe, expect, it } from "vitest";
import { balanceTransferWrites, planBalanceTransfer } from "../sheets/balanceTransfer";
import { BALANCE_CARRIED_IN_CATEGORY, BALANCE_CARRIED_OUT_CATEGORY } from "../sheets/tableConfigs";
import type { DebitoRow, EntradaRow, MonthData, MonthKpis, ValeAlimentacaoConsumoRow, ValeAlimentacaoCreditoRow } from "../sheets/types";

const kpis = (overrides: Partial<MonthKpis> = {}): MonthKpis => ({
  recebido: 0,
  aReceber: 0,
  pago: 0,
  aPagar: 0,
  saldoAtual: 0,
  saldoFinal: 0,
  valeAlimentacaoRecebido: 0,
  valeAlimentacaoSaldo: 0,
  ...overrides,
});

const month = (name: string, overrides: Partial<MonthData> = {}): MonthData => ({
  year: "2026",
  month: name,
  kpis: kpis(),
  entradas: [],
  debitos: [],
  valeAlimentacaoCredito: [],
  valeAlimentacaoConsumo: [],
  nubank: [],
  ...overrides,
});

const entrada = (name: string, categoria: string, valor: number): EntradaRow => ({
  rowIndex: 0, date: "01/10/2026", name, categoria, valor, installment: null, recebido: true, isReservaWithdrawal: false,
});
const debito = (name: string, categoria: string, valor: number): DebitoRow => ({
  rowIndex: 0, date: "30/09/2026", name, categoria, valor, installment: null, quem: "Luiz", pago: true, isPoupanca: false,
});
const credito = (name: string, valor: number): ValeAlimentacaoCreditoRow => ({
  rowIndex: 0, date: "01/10/2026", name, valor, quem: "Luiz", recebido: true,
});
const consumo = (name: string, valor: number): ValeAlimentacaoConsumoRow => ({
  rowIndex: 0, date: "30/09/2026", name, valor, quem: "Luiz", pago: true,
});

describe("planBalanceTransfer", () => {
  it("moves the current balance and the voucher leftover, both sides still to write", () => {
    const source = month("Setembro", { kpis: kpis({ saldoAtual: 422.594, valeAlimentacaoSaldo: 510.59, aPagar: 250 }) });
    const plan = planBalanceTransfer(source, month("Outubro"));
    expect(plan.from).toEqual({ year: "2026", month: "Setembro" });
    expect(plan.to).toEqual({ year: "2026", month: "Outubro" });
    expect(plan.legs).toEqual([
      { kind: "saldo", amount: 422.59, writeSource: true, writeTarget: true },
      { kind: "vale", amount: 510.59, writeSource: true, writeTarget: true },
    ]);
    expect(plan.pending).toEqual({ aReceber: 0, aPagar: 250 });
  });

  it("moves nothing when the balance is zero or negative", () => {
    const plan = planBalanceTransfer(month("Setembro", { kpis: kpis({ saldoAtual: -80, valeAlimentacaoSaldo: 0 }) }), month("Outubro"));
    expect(plan.legs).toEqual([]);
  });

  it("is done once both sides are written", () => {
    const source = month("Setembro", {
      debitos: [debito("Saldo transferido p/ Outubro", BALANCE_CARRIED_OUT_CATEGORY, 422.59)],
      valeAlimentacaoConsumo: [consumo("Saldo transferido p/ Outubro", 510.59)],
    });
    const target = month("Outubro", {
      entradas: [entrada("Saldo mês anterior", BALANCE_CARRIED_IN_CATEGORY, 422.59)],
      valeAlimentacaoCredito: [credito("Saldo mês anterior", 510.59)],
    });
    expect(planBalanceTransfer(source, target).legs).toEqual([]);
  });

  it("finishes a transfer that stopped halfway, taking the amount from the old month's marking line", () => {
    // Old month already zeroed: the amount comes from its marking line, not from the (now zero) balance.
    const source = month("Setembro", {
      debitos: [debito("Saldo transferido p/ Outubro", BALANCE_CARRIED_OUT_CATEGORY, 422.59)],
      valeAlimentacaoConsumo: [consumo("Saldo transferido p/ Outubro", 510.59)],
    });
    expect(planBalanceTransfer(source, month("Outubro")).legs).toEqual([
      { kind: "saldo", amount: 422.59, writeSource: false, writeTarget: true },
      { kind: "vale", amount: 510.59, writeSource: false, writeTarget: true },
    ]);
  });

  it("leaves a balance already received alone, since it may read the old month by formula", () => {
    const source = month("Agosto", { kpis: kpis({ saldoAtual: 21.1, valeAlimentacaoSaldo: 21.08 }) });
    // By category, whatever the name.
    expect(planBalanceTransfer(source, month("Setembro", { entradas: [entrada("Sobra", "Saldo mes anterior", 21.1)] })).legs).toEqual([
      { kind: "vale", amount: 21.08, writeSource: true, writeTarget: true },
    ]);
    // By name, as typed before the category existed.
    expect(planBalanceTransfer(source, month("Setembro", { entradas: [entrada("Saldo mes anterior", "Extraordinario", 21.1)] })).legs).toEqual([
      { kind: "vale", amount: 21.08, writeSource: true, writeTarget: true },
    ]);
  });
});

describe("balanceTransferWrites", () => {
  it("writes the old month first, dating the old month's lines on its last day", () => {
    const plan = planBalanceTransfer(
      month("Setembro", { kpis: kpis({ saldoAtual: 422.59, valeAlimentacaoSaldo: 510.59 }) }),
      month("Outubro"),
    );
    expect(balanceTransferWrites(plan)).toEqual([
      {
        side: "source",
        tableId: "debitos",
        values: {
          date: "30/09/2026",
          name: "Saldo transferido p/ Outubro",
          category: BALANCE_CARRIED_OUT_CATEGORY,
          quem: "Luiz e Jéssica",
          valor: 422.59,
          checkbox: true,
        },
      },
      {
        side: "source",
        tableId: "valeAlimentacaoConsumo",
        values: { date: "30/09/2026", name: "Saldo transferido p/ Outubro", quem: "Luiz e Jéssica", valor: 510.59, checkbox: true },
      },
      {
        side: "target",
        tableId: "entradas",
        values: { date: "01/10/2026", name: "Saldo mês anterior", category: BALANCE_CARRIED_IN_CATEGORY, valor: 422.59, checkbox: true },
      },
      {
        side: "target",
        tableId: "valeAlimentacaoCredito",
        values: { date: "01/10/2026", name: "Saldo mês anterior", quem: "Luiz e Jéssica", valor: 510.59, checkbox: true },
      },
    ]);
  });

  it("crosses the year boundary, Dezembro into Janeiro", () => {
    const source = { ...month("Dezembro", { kpis: kpis({ saldoAtual: 10 }) }) };
    const target = { ...month("Janeiro"), year: "2027" };
    const [out, entry] = balanceTransferWrites(planBalanceTransfer(source, target));
    expect(entry.values.date).toBe("01/01/2027");
    expect(out.values.date).toBe("31/12/2026");
    expect(out.values.name).toBe("Saldo transferido p/ Janeiro");
  });
});
