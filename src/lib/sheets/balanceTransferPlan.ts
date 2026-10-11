import "server-only";
import { balanceTransferWrites, planBalanceTransfer, type BalanceTransferPlan } from "./balanceTransfer";
import { getPreviousMonthRef } from "./monthNames";
import { readMonth, readMonths } from "./readMonth";
import { getSpreadsheetId } from "./spreadsheetRegistry";
import type { MonthData } from "./types";
import { createRow } from "./writeRow";

async function read(year: string, month: string, fresh: boolean): Promise<MonthData | null> {
  const spreadsheetId = getSpreadsheetId(year);
  if (!fresh) return readMonth(spreadsheetId, year, month);
  return (await readMonths(spreadsheetId, year, [month])).get(month) ?? null;
}

/**
 * What moving the previous month's leftover into `month` still needs, or null when there is no previous
 * month to read (first tab, or a year without a spreadsheet). `fresh` skips the short grid cache, for
 * right before writing: a stale read could write the same transfer twice.
 */
export async function readBalanceTransferPlan(
  year: string,
  month: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<BalanceTransferPlan | null> {
  const previous = getPreviousMonthRef(year, month);
  if (!previous) return null;
  try {
    const [source, target] = await Promise.all([read(previous.year, previous.month, fresh), read(year, month, fresh)]);
    return source && target ? planBalanceTransfer(source, target) : null;
  } catch {
    // Missing tab or spreadsheet: nothing to move from.
    return null;
  }
}

/** Writes the plan's rows one at a time, in the order `balanceTransferWrites` gives (old month first). */
export async function writeBalanceTransfer(plan: BalanceTransferPlan): Promise<void> {
  for (const write of balanceTransferWrites(plan)) {
    const ref = write.side === "target" ? plan.to : plan.from;
    await createRow(getSpreadsheetId(ref.year), ref.month, write.tableId, write.values);
  }
}
