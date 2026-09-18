import { notFound } from "next/navigation";
import { CategoryNavList, type CategoryNavItem } from "@/components/finance/category-nav-list";
import { KpiSummary } from "@/components/finance/kpi-summary";
import { TABLE_TABS } from "@/components/finance/table-tabs";
import { readMonth } from "@/lib/sheets/readMonth";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;

  let spreadsheetId: string;
  try {
    spreadsheetId = getSpreadsheetId(year);
  } catch {
    notFound();
  }

  const monthData = await readMonth(spreadsheetId, year, month);

  const entradasTotal = monthData.entradas.reduce((acc, row) => acc + row.valor, 0);
  const debitosTotal = monthData.debitos.reduce((acc, row) => acc + row.valor, 0);
  const valeRecebido = monthData.valeAlimentacaoCredito.reduce((acc, row) => acc + row.valor, 0);
  const valeGasto = monthData.valeAlimentacaoConsumo
    .filter((r) => r.pago)
    .reduce((acc, r) => acc + r.valor, 0);
  const nubankTotal = monthData.nubank.reduce((acc, row) => acc + row.valor, 0);

  const items: CategoryNavItem[] = [
    { slug: "entradas", label: TABLE_TABS[0].label, color: TABLE_TABS[0].color, count: monthData.entradas.length, total: entradasTotal },
    { slug: "debitos", label: TABLE_TABS[1].label, color: TABLE_TABS[1].color, count: monthData.debitos.length, total: debitosTotal },
    {
      slug: "vale-alimentacao",
      label: TABLE_TABS[2].label,
      color: TABLE_TABS[2].color,
      count: monthData.valeAlimentacaoCredito.length + monthData.valeAlimentacaoConsumo.length,
      total: valeRecebido - valeGasto,
    },
    { slug: "nubank", label: TABLE_TABS[3].label, color: TABLE_TABS[3].color, count: monthData.nubank.length, total: nubankTotal },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
      <div className="shrink-0">
        <KpiSummary kpis={monthData.kpis} />
      </div>
      <CategoryNavList items={items} year={year} month={month} />
    </div>
  );
}
