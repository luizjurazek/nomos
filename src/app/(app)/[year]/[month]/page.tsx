import { notFound } from "next/navigation";
import { MonthHome } from "@/components/finance/month-home";
import { isTableSlug } from "@/components/finance/table-tabs";
import { getInitialSavingsBalance } from "@/lib/analysis/config";
import { currentMonthNow } from "@/lib/analysis/months";
import { readAllYears } from "@/lib/analysis/readAllYears";
import { monthDataNet, summarizeSavings } from "@/lib/analysis/savings";
import { BALANCE_TRANSFER_WINDOW_DAYS } from "@/lib/sheets/balanceTransfer";
import { readBalanceTransferPlan } from "@/lib/sheets/balanceTransferPlan";
import { getCategories } from "@/lib/sheets/categories";
import { getCurrentDayOfMonth, getCurrentYearMonth, monthIndex } from "@/lib/sheets/monthNames";
import { readMonth } from "@/lib/sheets/readMonth";
import { getCategoriesSpreadsheetId, getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export default async function MonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ year, month: rawMonth }, { tab }] = await Promise.all([params, searchParams]);
  const month = decodeURIComponent(rawMonth);

  let spreadsheetId: string;
  try {
    spreadsheetId = getSpreadsheetId(year);
  } catch {
    notFound();
  }

  // The leftover shortcut only shows on the current month, in its first days.
  const now = getCurrentYearMonth();
  const offerBalanceTransfer =
    Number(year) === now.year && monthIndex(month) === now.monthIndex && getCurrentDayOfMonth() <= BALANCE_TRANSFER_WINDOW_DAYS;

  const [monthData, categories, history, initialBalance, balanceTransfer] = await Promise.all([
    readMonth(spreadsheetId, year, month),
    getCategories(getCategoriesSpreadsheetId()),
    // Every month of every year (cached ~1 min, shared with /analise): only feeds the savings total, so
    // a failed read just hides that number instead of breaking the month.
    readAllYears().catch(() => null),
    // Savings from before this app existed; missing "Config" tab just means no offset.
    getInitialSavingsBalance().catch(() => 0),
    offerBalanceTransfer ? readBalanceTransferPlan(year, month) : null,
  ]);
  const savings = summarizeSavings(history, { year, month }, currentMonthNow(), monthDataNet(monthData), initialBalance);

  return (
    <MonthHome
      monthData={monthData}
      savings={savings}
      year={year}
      month={month}
      categoriasEntradas={categories.entradas}
      categoriasSaidas={categories.saidas}
      initialTab={tab && isTableSlug(tab) ? tab : undefined}
      balanceTransfer={balanceTransfer && balanceTransfer.legs.length > 0 ? balanceTransfer : null}
    />
  );
}
