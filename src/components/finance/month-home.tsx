"use client";

import { useEffect, useState, useTransition } from "react";
import { syncCardRolloverAction } from "@/app/(app)/[year]/[month]/actions";
import type { MonthData } from "@/lib/sheets/types";
import { BalanceHero } from "./balance-hero";
import { DebitosTable } from "./debitos-table";
import { EntradasTable } from "./entradas-table";
import { MonthSummaryDropdown } from "./month-summary-dropdown";
import { NubankTable } from "./nubank-table";
import { TableBadgeStrip } from "./table-badge-strip";
import { getTab, type TableSlug } from "./table-tabs";
import { UpcomingBillsCard } from "./upcoming-bills-card";
import { VaBalanceCard } from "./va-balance-card";
import { ValeAlimentacaoTable } from "./vale-alimentacao-table";

interface MonthHomeProps {
  monthData: MonthData;
  year: string;
  month: string;
  categoriasEntradas: string[];
  categoriasSaidas: string[];
  initialTab: TableSlug;
}

/** Nubank-style month screen: balance cards on top, then badges that swap the list shown below. */
export function MonthHome({ monthData, year, month, categoriasEntradas, categoriasSaidas, initialTab }: MonthHomeProps) {
  // Tab lives in local state so switching badges never re-runs the server read.
  const [activeTab, setActiveTab] = useState<TableSlug>(initialTab);
  const [, startTransition] = useTransition();

  // Reading a month is read-only; the "Cartão de crédito" row is synced here, explicitly, after the
  // screen is up. The action only refreshes the page when the sheet actually changed.
  useEffect(() => {
    startTransition(async () => {
      try {
        await syncCardRolloverAction(year, month);
      } catch {
        // Best effort: a failed sync must never get in the way of reading the month.
      }
    });
  }, [year, month]);

  return (
    <div className="flex flex-col gap-3">
      <BalanceHero kpis={monthData.kpis} />
      <VaBalanceCard
        saldo={monthData.kpis.valeAlimentacaoSaldo}
        color={getTab("vale-alimentacao").color}
        onSelect={() => setActiveTab("vale-alimentacao")}
      />
      <UpcomingBillsCard debitos={monthData.debitos} onSelect={() => setActiveTab("debitos")} />
      <MonthSummaryDropdown kpis={monthData.kpis} />

      <div className="sticky top-0 z-10 -mt-1 bg-background/90 backdrop-blur">
        <TableBadgeStrip active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "entradas" && (
        <EntradasTable rows={monthData.entradas} year={year} month={month} categories={categoriasEntradas} />
      )}
      {activeTab === "debitos" && (
        <DebitosTable rows={monthData.debitos} year={year} month={month} categories={categoriasSaidas} />
      )}
      {activeTab === "vale-alimentacao" && (
        <ValeAlimentacaoTable
          credito={monthData.valeAlimentacaoCredito}
          consumo={monthData.valeAlimentacaoConsumo}
          year={year}
          month={month}
        />
      )}
      {activeTab === "nubank" && (
        <NubankTable rows={monthData.nubank} year={year} month={month} categories={categoriasSaidas} />
      )}
    </div>
  );
}
