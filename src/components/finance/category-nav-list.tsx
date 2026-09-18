import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";

export interface CategoryNavItem {
  slug: string;
  label: string;
  color: string;
  count: number;
  total: number;
}

/** A single, simple list of the 4 categories (like an iOS Settings list) — no boxes competing for attention, just rows leading into the full detail view. */
export function CategoryNavList({ items, year, month }: { items: CategoryNavItem[]; year: string; month: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {items.map((item, index) => (
        <Link
          key={item.slug}
          href={`/${year}/${month}/${item.slug}`}
          className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/60 ${
            index > 0 ? "border-t border-border" : ""
          }`}
        >
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
          <span className="shrink-0 text-xs text-foreground-secondary">{item.count}</span>
          <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(item.total)}</span>
          <ChevronRight className="size-4 shrink-0 text-foreground-secondary" />
        </Link>
      ))}
    </div>
  );
}
