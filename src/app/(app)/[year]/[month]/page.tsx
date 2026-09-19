import { notFound } from "next/navigation";
import { MonthHome } from "@/components/finance/month-home";
import { isTableSlug } from "@/components/finance/table-tabs";
import { currentMonthNow } from "@/lib/analysis/months";
import { readAllYears } from "@/lib/analysis/readAllYears";
import { monthDataNet, summarizeSavings } from "@/lib/analysis/savings";
import { getCategories } from "@/lib/sheets/categories";
import { readMonth } from "@/lib/sheets/readMonth";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export default async function MonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ year, month }, { tab }] = await Promise.all([params, searchParams]);

  let spreadsheetId: string;
  try {
    spreadsheetId = getSpreadsheetId(year);
  } catch {
    notFound();
  }

  const [monthData, categories, history] = await Promise.all([
    readMonth(spreadsheetId, year, month),
    getCategories(spreadsheetId),
    // Every month of every year (cached ~1 min, shared with /analise): only feeds the savings total, so
    // a failed read just hides that number instead of breaking the month.
    readAllYears().catch(() => null),
  ]);
  const savings = summarizeSavings(history, { year, month }, currentMonthNow(), monthDataNet(monthData));

  return (
    <MonthHome
      monthData={monthData}
      savings={savings}
      year={year}
      month={month}
      categoriasEntradas={categories.entradas}
      categoriasSaidas={categories.saidas}
      initialTab={tab && isTableSlug(tab) ? tab : undefined}
    />
  );
}
