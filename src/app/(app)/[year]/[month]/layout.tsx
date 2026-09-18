import { AddEntryFab } from "@/components/finance/add-entry-fab";
import { ThemeToggle } from "@/components/finance/theme-toggle";
import { YearMonthSwitcher } from "@/components/finance/year-month-switcher";
import { listAvailableYears } from "@/lib/sheets/spreadsheetRegistry";

export default async function MonthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = await params;
  const years = listAvailableYears();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <header className="glass-surface z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h1 className="shrink-0 truncate text-sm font-semibold tracking-tight sm:text-base">
          <span className="hidden sm:inline">Controle financeiro</span>
          <span className="sm:hidden">Financeiro</span>
        </h1>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <YearMonthSwitcher years={years} activeYear={year} activeMonth={month} />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6">{children}</main>
      <AddEntryFab year={year} month={month} />
    </div>
  );
}
