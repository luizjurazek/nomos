"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export function YearMonthSwitcher({ years, activeYear, activeMonth }: YearMonthSwitcherProps) {
  const router = useRouter();
  const [months, setMonths] = useState<string[]>([activeMonth]);

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

  return (
    <div className="flex gap-1.5 sm:gap-2">
      <Select value={activeYear} onValueChange={(year) => router.push(`/${year}/${activeMonth}`)}>
        <SelectTrigger className="w-[72px] sm:w-[90px]" aria-label="Ano">
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
      <Select value={activeMonth} onValueChange={(month) => router.push(`/${activeYear}/${month}`)}>
        <SelectTrigger className="w-[104px] sm:w-[140px]" aria-label="Mês">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={month}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
