import "server-only";
import { formatCurrency, toNumber } from "../format/currency";
import { parseInstallment } from "../format/installment";
import { syncCardRollover } from "./cardRollover";
import { fetchMonthGrids } from "./gridIO";
import { locateTables } from "./locateTables";
import { extractRawRows } from "./rowExtraction";
import { CARD_ROLLOVER_CATEGORY, TABLE_CONFIGS } from "./tableConfigs";
import type {
  DebitoRow,
  EntradaRow,
  MonthData,
  MonthKpis,
  NubankRow,
  SheetCell,
  ValeAlimentacaoConsumoRow,
  ValeAlimentacaoCreditoRow,
} from "./types";

const text = (value: SheetCell | undefined) => String(value ?? "").trim();
const bool = (value: SheetCell | undefined) => value === true || value === "TRUE";

function sum(rows: { valor: number }[]): number {
  return rows.reduce((acc, row) => acc + row.valor, 0);
}

export async function readMonth(spreadsheetId: string, year: string, monthTitle: string): Promise<MonthData> {
  // Self-heal the "Cartão de crédito" rollover row before reading Débitos, so it's always
  // in sync with the previous month's Nubank total — whether that changed since the last
  // visit, or this month's tab was only just created.
  await syncCardRollover(spreadsheetId, year, monthTitle);

  const { formatted, raw } = await fetchMonthGrids(spreadsheetId, monthTitle);
  const located = locateTables(formatted);

  const entradas: EntradaRow[] = located.entradas
    ? extractRawRows(raw, located.entradas, TABLE_CONFIGS.entradas.columnOrder).map((row) => {
        const categoria = text(row.values.category);
        return {
          rowIndex: row.rowIndex,
          date: text(row.values.date),
          name: text(row.values.name),
          categoria,
          valor: toNumber(row.values.valor),
          recebido: bool(row.values.checkbox),
          isReservaWithdrawal: TABLE_CONFIGS.entradas.semanticTags.some(
            (tag) => tag.category === categoria,
          ),
        };
      })
    : [];

  const debitos: DebitoRow[] = located.debitos
    ? extractRawRows(raw, located.debitos, TABLE_CONFIGS.debitos.columnOrder).map((row) => {
        const categoria = text(row.values.category);
        return {
          rowIndex: row.rowIndex,
          date: text(row.values.date),
          name: text(row.values.name),
          categoria,
          quem: text(row.values.quem),
          valor: toNumber(row.values.valor),
          pago: bool(row.values.checkbox),
          isPoupanca: TABLE_CONFIGS.debitos.semanticTags.some((tag) => tag.category === categoria),
          isCardRollover: categoria === CARD_ROLLOVER_CATEGORY,
        };
      })
    : [];

  const nubank: NubankRow[] = located.nubank
    ? extractRawRows(raw, located.nubank, TABLE_CONFIGS.nubank.columnOrder).map((row) => {
        const name = text(row.values.name);
        return {
          rowIndex: row.rowIndex,
          date: text(row.values.date),
          name,
          categoria: text(row.values.category),
          quem: text(row.values.quem),
          valor: toNumber(row.values.valor),
          installment: parseInstallment(name),
        };
      })
    : [];

  const valeAlimentacaoCredito: ValeAlimentacaoCreditoRow[] = located.valeAlimentacaoCredito
    ? extractRawRows(raw, located.valeAlimentacaoCredito, TABLE_CONFIGS.valeAlimentacaoCredito.columnOrder).map(
        (row) => ({
          rowIndex: row.rowIndex,
          date: text(row.values.date),
          name: text(row.values.name),
          quem: text(row.values.quem),
          valor: toNumber(row.values.valor),
          recebido: bool(row.values.checkbox),
        }),
      )
    : [];

  const valeAlimentacaoConsumo: ValeAlimentacaoConsumoRow[] = located.valeAlimentacaoConsumo
    ? extractRawRows(raw, located.valeAlimentacaoConsumo, TABLE_CONFIGS.valeAlimentacaoConsumo.columnOrder).map(
        (row) => ({
          rowIndex: row.rowIndex,
          date: text(row.values.date),
          name: text(row.values.name),
          quem: text(row.values.quem),
          valor: toNumber(row.values.valor),
          pago: bool(row.values.checkbox),
        }),
      )
    : [];

  const kpis = computeKpis({ entradas, debitos, valeAlimentacaoCredito, valeAlimentacaoConsumo });

  return {
    year,
    month: monthTitle,
    kpis,
    entradas,
    debitos,
    valeAlimentacaoCredito,
    valeAlimentacaoConsumo,
    nubank,
  };
}

function computeKpis(data: {
  entradas: EntradaRow[];
  debitos: DebitoRow[];
  valeAlimentacaoCredito: ValeAlimentacaoCreditoRow[];
  valeAlimentacaoConsumo: ValeAlimentacaoConsumoRow[];
}): MonthKpis {
  const totalPrevistoEntradas = sum(data.entradas);
  const recebido = sum(data.entradas.filter((row) => row.recebido));
  const totalPrevistoDebitos = sum(data.debitos);
  const pago = sum(data.debitos.filter((row) => row.pago));

  const valeAlimentacaoRecebido = sum(data.valeAlimentacaoCredito);
  const valeGasto = sum(data.valeAlimentacaoConsumo.filter((row) => row.pago));

  return {
    recebido,
    aReceber: totalPrevistoEntradas - recebido,
    pago,
    aPagar: totalPrevistoDebitos - pago,
    saldoAtual: recebido - pago,
    saldoFinal: totalPrevistoEntradas - totalPrevistoDebitos,
    valeAlimentacaoRecebido,
    valeAlimentacaoSaldo: valeAlimentacaoRecebido - valeGasto,
  };
}

export { formatCurrency };
