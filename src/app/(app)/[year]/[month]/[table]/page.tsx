import { notFound } from "next/navigation";
import { KpiSummary } from "@/components/finance/kpi-summary";
import { MonthTables } from "@/components/finance/month-tables";
import { isTableSlug } from "@/components/finance/table-tabs";
import { getCategories } from "@/lib/sheets/categories";
import { readMonth } from "@/lib/sheets/readMonth";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string; table: string }>;
}) {
  const { year, month, table } = await params;
  if (!isTableSlug(table)) notFound();

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <KpiSummary kpis={monthData.kpis} />
      </div>
      <MonthTables
        activeTab={table}
        entradas={monthData.entradas}
        debitos={monthData.debitos}
        valeAlimentacaoCredito={monthData.valeAlimentacaoCredito}
        valeAlimentacaoConsumo={monthData.valeAlimentacaoConsumo}
        nubank={monthData.nubank}
        year={year}
        month={month}
        categoriasEntradas={categories.entradas}
        categoriasSaidas={categories.saidas}
      />
    </div>
  );
}
