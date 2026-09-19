import Image from "next/image";
import { AppMenu, AppNav } from "@/components/finance/app-menu";
import { ThemeToggle } from "@/components/finance/theme-toggle";

/** Own shell for /analise: same header as the month screen, plus a scroll area. */
export default function AnaliseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <header className="glass-surface relative z-10 shrink-0 border-b border-border px-4 py-3 sm:px-6">
        {/* Same max width as <main>, so on wide screens the header lines up with the content. */}
        <div className="mx-auto flex w-full max-w-3xl lg:max-w-6xl items-center justify-between gap-2">
          {/* The logo asset is white; invert it on the light theme so it stays visible. */}
          <Image src="/logo.png" alt="" width={40} height={40} className="size-10 invert dark:invert-0" />
          <AppNav />
          <div className="flex items-center gap-1">
            <AppMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-3xl lg:max-w-6xl px-4 pt-4 pb-28 sm:px-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
