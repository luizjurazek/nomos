"use client";

import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format/currency";
import { dayLabel, groupRowsByDay } from "@/lib/format/dayGroups";
import { useToday } from "./use-today";

interface ListRow {
  rowIndex: number;
  date: string;
  name: string;
  valor: number;
  categoria?: string;
}

interface EntryListProps<T extends ListRow> {
  rows: T[];
  renderRow: (row: T) => ReactNode;
  emptyMessage: string;
  /** Search box + category badges above the list. Off for lists without categories to filter by. */
  filterable?: boolean;
}

/** Lowercase and strip accents so "cafe" finds "Café". */
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** A list of rows grouped by day (Hoje, Ontem, 12 de setembro...), optionally filtered by text and category. */
export function EntryList<T extends ListRow>({ rows, renderRow, emptyMessage, filterable = false }: EntryListProps<T>) {
  const today = useToday();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.categoria?.trim() ?? "").filter(Boolean))],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return rows.filter((row) => {
      if (category && row.categoria !== category) return false;
      if (!needle) return true;
      return normalize(`${row.name} ${row.categoria ?? ""}`).includes(needle);
    });
  }, [rows, query, category]);

  const groups = useMemo(() => groupRowsByDay(filtered), [filtered]);
  const filtering = Boolean(query.trim() || category);
  const showCategories = filterable && categories.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {filterable && rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-secondary" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou categoria"
              aria-label="Buscar lançamentos"
              className="h-10 rounded-full pl-9"
            />
          </div>
          {showCategories && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
              {["", ...categories].map((option) => {
                const active = option === category;
                return (
                  <button
                    key={option || "all"}
                    type="button"
                    onClick={() => setCategory(option)}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground-secondary hover:bg-accent/60"
                    }`}
                  >
                    {option || "Todas"}
                  </button>
                );
              })}
            </div>
          )}
          {filtering && (
            <p className="px-1 text-xs text-foreground-secondary">
              {filtered.length} {filtered.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
              {formatCurrency(filtered.reduce((acc, row) => acc + row.valor, 0))}
            </p>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          {emptyMessage}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-foreground-secondary">
          Nada encontrado para esse filtro.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-1.5">
            <h3 className="px-1 text-xs font-medium tracking-wide text-foreground-secondary uppercase">
              {dayLabel(group.key, today)}
            </h3>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {group.rows.map((row) => (
                <div key={row.rowIndex}>{renderRow(row)}</div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
