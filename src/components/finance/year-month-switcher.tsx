"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearMonthSwitcherProps {
  years: string[];
  activeYear: string;
  activeMonth: string;
}

/** Period picker shown at the top of the month screen: year dropdown plus a scrollable strip of months. */
export function YearMonthSwitcher({ years, activeYear, activeMonth }: YearMonthSwitcherProps) {
  const router = useRouter();
  const [months, setMonths] = useState<string[]>([activeMonth]);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/years/${activeYear}/months`)
      .then((res) => res.json())
      .then((data: { months: string[] }) => {
        if (!cancelled) setMonths(data.months);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeYear]);

  // Keep the selected month in view when the list loads or the month changes.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [months, activeMonth]);

  // The target year may not have the current month's tab (yet), so ask which months it has:
  // keep the same month when it exists, otherwise land on the latest one.
  const goToYear = async (year: string | null) => {
    if (!year) return;
    try {
      const res = await fetch(`/api/years/${year}/months`);
      const data: { months: string[] } = await res.json();
      if (data.months.length === 0) {
        toast.error(`Não há meses disponíveis em ${year}.`);
        return;
      }
      const month = data.months.includes(activeMonth) ? activeMonth : data.months[data.months.length - 1];
      router.push(`/${year}/${month}`);
    } catch {
      toast.error("Não foi possível trocar de ano.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={activeYear} onValueChange={goToYear}>
        <SelectTrigger className="w-[84px] shrink-0 rounded-full" aria-label="Ano">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <nav
        aria-label="Mês"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {months.map((month) => {
          const active = month === activeMonth;
          return (
            <Link
              key={month}
              ref={active ? activeRef : undefined}
              // Visiting a month can write to the sheet (card rollover), so never prefetch the other months.
              prefetch={false}
              href={`/${activeYear}/${month}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary"
                  : "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-accent/60"
              }
            >
              {month}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
