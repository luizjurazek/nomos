import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type {
  DebitoRow,
  EntradaRow,
  NubankRow,
  ValeAlimentacaoConsumoRow,
  ValeAlimentacaoCreditoRow,
} from "@/lib/sheets/types";
import { DebitosTable } from "./debitos-table";
import { EntradasTable } from "./entradas-table";
import { NubankTable } from "./nubank-table";
import { TABLE_TABS, type TableSlug } from "./table-tabs";
import { ValeAlimentacaoTable } from "./vale-alimentacao-table";

interface MonthTablesProps {
  activeTab: TableSlug;
  entradas: EntradaRow[];
  debitos: DebitoRow[];
  valeAlimentacaoCredito: ValeAlimentacaoCreditoRow[];
  valeAlimentacaoConsumo: ValeAlimentacaoConsumoRow[];
  nubank: NubankRow[];
  year: string;
  month: string;
  categoriasEntradas: string[];
  categoriasSaidas: string[];
}

/** Focused, full-height single-table view — reached by drilling into a category from the month overview. */
export function MonthTables({
  activeTab,
  entradas,
  debitos,
  valeAlimentacaoCredito,
  valeAlimentacaoConsumo,
  nubank,
  year,
  month,
  categoriasEntradas,
  categoriasSaidas,
}: MonthTablesProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-1">
        <Link
          href={`/${year}/${month}`}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-accent/60"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Visão geral</span>
        </Link>
        {TABLE_TABS.map((tab) => {
          const active = tab.slug === activeTab;
          return (
            <Link
              key={tab.slug}
              href={`/${year}/${month}/${tab.slug}`}
              className={
                active
                  ? "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors"
                  : "flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-accent/60"
              }
              style={active ? { backgroundColor: tab.color } : undefined}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </Link>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "entradas" && (
          <EntradasTable rows={entradas} year={year} month={month} categories={categoriasEntradas} />
        )}
        {activeTab === "debitos" && (
          <DebitosTable rows={debitos} year={year} month={month} categories={categoriasSaidas} />
        )}
        {activeTab === "vale-alimentacao" && (
          <ValeAlimentacaoTable
            credito={valeAlimentacaoCredito}
            consumo={valeAlimentacaoConsumo}
            year={year}
            month={month}
          />
        )}
        {activeTab === "nubank" && (
          <NubankTable rows={nubank} year={year} month={month} categories={categoriasSaidas} />
        )}
      </div>
    </div>
  );
}
