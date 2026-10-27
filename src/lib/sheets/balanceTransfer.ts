import { formatSheetDate } from "../format/date";
import { getMonthNumber } from "./monthNames";
import { BALANCE_CARRIED_IN_CATEGORY, BALANCE_CARRIED_OUT_CATEGORY, CARD_ROLLOVER_DEFAULT_QUEM } from "./tableConfigs";
import type { ColumnRole, MonthData, SheetCell, TableId } from "./types";

/** The shortcut shows on the first days of the month only: by then the previous month is closed. */
export const BALANCE_TRANSFER_WINDOW_DAYS = 10;

/** Name of the line that receives the balance in the new month (same as the rows typed by hand before the app). */
export const CARRIED_BALANCE_NAME = "Saldo mês anterior";

/** Name of the line that takes the balance out of the month it leaves. */
export const transferredBalanceName = (toMonth: string) => `Saldo transferido p/ ${toMonth}`;

const normalize = (name: string) => name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
const isCarriedName = (name: string) => normalize(name) === normalize(CARRIED_BALANCE_NAME);
const isTransferredName = (name: string) => normalize(name).startsWith("saldo transferido");
const isCategory = (row: { categoria: string }, category: string) => normalize(row.categoria) === normalize(category);

/** Either end of a balance transfer, whatever the accents or case it was typed with. */
export function isBalanceTransferCategory(category: string): boolean {
  const name = normalize(category);
  return name === normalize(BALANCE_CARRIED_IN_CATEGORY) || name === normalize(BALANCE_CARRIED_OUT_CATEGORY);
}
const cents = (value: number) => Math.round(value * 100) / 100;

export type BalanceTransferKind = "saldo" | "vale";

/**
 * One balance to move. Each side is checked on its own, so a transfer that stopped halfway (one side
 * written, the other not) is finished by running it again, without writing the done side twice.
 */
export interface BalanceTransferLeg {
  kind: BalanceTransferKind;
  amount: number;
  /** The month it leaves still needs the line that zeroes it. */
  writeSource: boolean;
  /** The month it lands in still needs the line that receives it. */
  writeTarget: boolean;
}

export interface BalanceTransferPlan {
  from: { year: string; month: string };
  to: { year: string; month: string };
  /** Empty when there is nothing left to move (no balance, or already moved). */
  legs: BalanceTransferLeg[];
  /** What is still open in the month it leaves: the current balance doesn't count it yet. */
  pending: { aReceber: number; aPagar: number };
}

/**
 * `marked`: value of the line that already took the balance out of the old month, if any. `carried`: the new
 * month already received it. Once received the leg is done, even when the old month was never marked: a
 * balance typed by hand often reads the old month by formula (`=Agosto!A10`), so zeroing that month now would
 * zero it too. That is also why the old month is written first (see `balanceTransferWrites`).
 */
function leg(kind: BalanceTransferKind, marked: number | undefined, carried: boolean, balance: number): BalanceTransferLeg[] {
  if (carried) return [];
  // Once the old month is marked its balance is zero: the amount is the one on the marking line.
  const amount = cents(marked ?? balance);
  // Only a leftover moves; a negative balance stays where it is.
  if (amount <= 0) return [];
  return [{ kind, amount, writeSource: marked === undefined, writeTarget: true }];
}

function saldoLeg(source: MonthData, target: MonthData): BalanceTransferLeg[] {
  const marked = source.debitos.find((row) => isCategory(row, BALANCE_CARRIED_OUT_CATEGORY));
  const carried = target.entradas.some((row) => isCategory(row, BALANCE_CARRIED_IN_CATEGORY) || isCarriedName(row.name));
  return leg("saldo", marked?.valor, carried, source.kpis.saldoAtual);
}

function valeLeg(source: MonthData, target: MonthData): BalanceTransferLeg[] {
  const marked = source.valeAlimentacaoConsumo.find((row) => isTransferredName(row.name));
  const carried = target.valeAlimentacaoCredito.some((row) => isCarriedName(row.name));
  return leg("vale", marked?.valor, carried, source.kpis.valeAlimentacaoSaldo);
}

/** What moving `source`'s leftover (current balance and food voucher) into `target`, the month after it, still needs. */
export function planBalanceTransfer(source: MonthData, target: MonthData): BalanceTransferPlan {
  return {
    from: { year: source.year, month: source.month },
    to: { year: target.year, month: target.month },
    legs: [...saldoLeg(source, target), ...valeLeg(source, target)],
    pending: { aReceber: cents(source.kpis.aReceber), aPagar: cents(source.kpis.aPagar) },
  };
}

export interface BalanceTransferWrite {
  side: "source" | "target";
  tableId: TableId;
  values: Partial<Record<ColumnRole, SheetCell>>;
}

/**
 * The rows the plan writes, old month first: if a write fails halfway, the marking line already written
 * there keeps the amount for the next try, which then writes only the new month's line. The line leaving a month is dated on its
 * last day, the one arriving on the 1st; both are already paid/received.
 */
export function balanceTransferWrites(plan: BalanceTransferPlan): BalanceTransferWrite[] {
  const { from, to } = plan;
  const fromMonth = getMonthNumber(from.month);
  const lastDay = String(new Date(Date.UTC(Number(from.year), Number(fromMonth), 0)).getUTCDate());
  const sourceDate = formatSheetDate({ dayKnown: true, day: lastDay, month: fromMonth, year: from.year });
  const targetDate = formatSheetDate({ dayKnown: true, day: "01", month: getMonthNumber(to.month), year: to.year });
  const quem = CARD_ROLLOVER_DEFAULT_QUEM;

  const targets: BalanceTransferWrite[] = [];
  const sources: BalanceTransferWrite[] = [];
  for (const { kind, amount, writeSource, writeTarget } of plan.legs) {
    const outName = transferredBalanceName(to.month);
    if (kind === "saldo") {
      if (writeTarget) {
        targets.push({
          side: "target",
          tableId: "entradas",
          values: { date: targetDate, name: CARRIED_BALANCE_NAME, category: BALANCE_CARRIED_IN_CATEGORY, valor: amount, checkbox: true },
        });
      }
      if (writeSource) {
        sources.push({
          side: "source",
          tableId: "debitos",
          values: { date: sourceDate, name: outName, category: BALANCE_CARRIED_OUT_CATEGORY, quem, valor: amount, checkbox: true },
        });
      }
    } else {
      if (writeTarget) {
        targets.push({
          side: "target",
          tableId: "valeAlimentacaoCredito",
          values: { date: targetDate, name: CARRIED_BALANCE_NAME, quem, valor: amount, checkbox: true },
        });
      }
      if (writeSource) {
        sources.push({
          side: "source",
          tableId: "valeAlimentacaoConsumo",
          values: { date: sourceDate, name: outName, quem, valor: amount, checkbox: true },
        });
      }
    }
  }
  return [...sources, ...targets];
}
