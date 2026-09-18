import { notFound } from "next/navigation";
import { MonthHome } from "@/components/finance/month-home";
import { isTableSlug } from "@/components/finance/table-tabs";
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

  const [monthData, categories] = await Promise.all([
    readMonth(spreadsheetId, year, month),
    getCategories(spreadsheetId),
  ]);

  return (
    <MonthHome
      monthData={monthData}
      year={year}
      month={month}
      categoriasEntradas={categories.entradas}
      categoriasSaidas={categories.saidas}
      initialTab={tab && isTableSlug(tab) ? tab : "debitos"}
    />
  );
}
