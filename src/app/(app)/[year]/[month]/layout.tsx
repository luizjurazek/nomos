import Image from "next/image";
import { AddEntryFab } from "@/components/finance/add-entry-fab";
import { AppMenu, AppNav } from "@/components/finance/app-menu";
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
      <header className="glass-surface relative z-10 shrink-0 border-b border-border px-4 py-3 sm:px-6">
        {/* Same max width as <main>, so on wide screens the header lines up with the content. */}
        <div className="mx-auto flex w-full max-w-3xl lg:max-w-6xl items-center justify-between gap-2">
          <h1 className="flex shrink-0 items-center gap-2 truncate text-sm font-semibold tracking-tight sm:text-base">
            {/* The logo asset is white; invert it on the light theme so it stays visible. */}
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="size-10 invert dark:invert-0"
            />
          </h1>
          <AppNav />
          <div className="flex items-center gap-1">
            <AppMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {/* The whole month screen scrolls here so the badge strip can stick to the top of this container. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex w-full max-w-3xl lg:max-w-6xl flex-col gap-3 px-4 pt-4 pb-28 sm:px-6 lg:gap-5 lg:pt-6">
          <YearMonthSwitcher years={years} activeYear={year} activeMonth={month} />
          {children}
        </main>
      </div>
      <AddEntryFab year={year} month={month} />
    </div>
  );
}
