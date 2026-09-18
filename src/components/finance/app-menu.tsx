"use client";

import { BarChart3, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS = [
  { href: "/", label: "Início", Icon: Home, isActive: (pathname: string) => !pathname.startsWith("/analise") },
  { href: "/analise", label: "Análise", Icon: BarChart3, isActive: (pathname: string) => pathname.startsWith("/analise") },
];

/**
 * Header navigation on desktop: the screens sit in the middle of the header, no hamburger. The header
 * must be `relative` (the nav is centered against it). Phones use `AppMenu` instead.
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
      {ITEMS.map(({ href, label, Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            // Never prefetch: "/" reads the sheet tabs and /analise reads every month of every year.
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              active ? "bg-accent font-semibold text-foreground" : "font-medium text-foreground-secondary hover:bg-accent/60"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Hamburger menu for phones (hidden from `md` up, where `AppNav` takes over). "Início" goes through "/", which lands on the current month. */
export function AppMenu() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label="Menu">
            <Menu className="size-5" />
          </Button>
        }
      />
      {/* The popup defaults to the trigger's width, so give it its own. */}
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl p-2">
        {ITEMS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <DropdownMenuItem
              key={href}
              // Never prefetch: "/" reads the sheet tabs and /analise reads every month of every year.
              render={<Link href={href} prefetch={false} aria-current={active ? "page" : undefined} />}
              className={`gap-3 rounded-xl px-3 py-2.5 text-base ${active ? "bg-accent font-semibold" : ""}`}
            >
              <Icon className="size-5" />
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
