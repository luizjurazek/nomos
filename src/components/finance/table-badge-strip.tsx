"use client";

import { TABLE_TABS, type TableSlug } from "./table-tabs";

/** Horizontally scrollable badges that switch which table is listed below. */
export function TableBadgeStrip({ active, onChange }: { active: TableSlug; onChange: (slug: TableSlug) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      {TABLE_TABS.map((tab) => {
        const isActive = tab.slug === active;
        return (
          <button
            key={tab.slug}
            type="button"
            onClick={() => onChange(tab.slug)}
            aria-pressed={isActive}
            className={
              isActive
                ? "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium text-white transition-colors"
                : "shrink-0 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-accent/60"
            }
            style={isActive ? { backgroundColor: tab.color } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
