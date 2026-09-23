"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format/currency";
import { UNKNOWN_DAY_KEY, dayLabel, daysFromToday, groupRowsByDay } from "@/lib/format/dayGroups";
import { TableFooterStats, type Stat } from "./table-footer-stats";
import { useToday } from "./use-today";
import { readFilters, rememberFilters, type ListFilters } from "./view-memory";

interface ListRow {
  rowIndex: number;
  date: string;
  name: string;
  valor: number;
  categoria?: string;
  quem?: string;
}

interface EntryListProps<T extends ListRow> {
  rows: T[];
  renderRow: (row: T) => ReactNode;
  emptyMessage: string;
  /** Search box + category badges above the list. Off for lists without categories to filter by. */
  filterable?: boolean;
  /** Identifies the list so its filters survive a change of month (they are remembered per list). */
  memoryKey?: string;
  /** Totals strip on top of the list, computed from the rows that pass the current filters. */
  stats?: (rows: T[]) => Stat[];
}

/** Lowercase and strip accents so "cafe" finds "Café". */
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Value of the "no filter" option; Base UI selects don't take an empty string as a real choice. */
const ALL = "__all__";

/** Single-choice filter dropdown; the trigger shows what it filters (muted) next to the current choice, and fills in while a filter is on. */
function FilterSelect({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL || next === null ? "" : next)}>
      <SelectTrigger
        aria-label={`Filtrar por ${label.toLowerCase()}`}
        className={`h-auto min-h-10 min-w-0 flex-1 gap-2 rounded-3xl px-4 py-2 whitespace-normal shadow-none transition-colors data-[size=default]:h-auto data-[size=default]:min-h-10 ${
          value
            ? "border-foreground bg-foreground text-background dark:bg-foreground dark:hover:bg-foreground [&_svg]:text-background/70"
            : "border-border bg-card hover:bg-accent/60 dark:bg-card dark:hover:bg-accent/60"
        }`}
      >
        <SelectValue className="line-clamp-none">
          {(current) => (
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className={`text-xs ${value ? "text-background/70" : "text-foreground-secondary"}`}>{label}</span>
              <span className="min-w-0 break-words font-medium">{current === ALL ? allLabel : current}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A list of rows grouped by day (Hoje, Ontem, 12 de setembro...), optionally filtered by text and category. */
export function EntryList<T extends ListRow>({ rows, renderRow, emptyMessage, filterable = false, memoryKey, stats }: EntryListProps<T>) {
  const today = useToday();
  const [filters, setFilters] = useState<ListFilters>(() => readFilters(memoryKey));
  useEffect(() => {
    if (memoryKey) rememberFilters(memoryKey, filters);
  }, [memoryKey, filters]);
  const setQuery = (query: string) => setFilters((prev) => ({ ...prev, query }));
  const setCategory = (category: string) => setFilters((prev) => ({ ...prev, category }));
  const setQuem = (quem: string) => setFilters((prev) => ({ ...prev, quem }));

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.categoria?.trim() ?? "").filter(Boolean))],
    [rows],
  );

  const people = useMemo(() => [...new Set(rows.map((row) => row.quem?.trim() ?? "").filter(Boolean))], [rows]);

  const showCategories = filterable && categories.length > 1;
  const showPeople = filterable && people.length > 1;
  // A remembered choice only counts while its dropdown is there and the option exists in this month.
  const { query } = filters;
  const category = showCategories && categories.includes(filters.category) ? filters.category : "";
  const quem = showPeople && people.includes(filters.quem) ? filters.quem : "";

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return rows.filter((row) => {
      if (category && row.categoria !== category) return false;
      if (quem && row.quem !== quem) return false;
      if (!needle) return true;
      return normalize(`${row.name} ${row.categoria ?? ""}`).includes(needle);
    });
  }, [rows, query, category, quem]);

  const groups = useMemo(() => groupRowsByDay(filtered), [filtered]);
  const filtering = Boolean(query.trim() || category || quem);

  return (
    <div className="flex flex-col gap-3">
      {stats && <TableFooterStats stats={stats(filtered)} />}
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
          {(showPeople || showCategories) && (
            <div className="flex gap-2">
              {showPeople && (
                <FilterSelect label="Quem" allLabel="Todos" options={people} value={quem} onChange={setQuem} />
              )}
              {showCategories && (
                <FilterSelect
                  label="Categoria"
                  allLabel="Todas"
                  options={categories}
                  value={category}
                  onChange={setCategory}
                />
              )}
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
        groups.map((group) => {
          const daysAhead = today && group.key !== UNKNOWN_DAY_KEY ? daysFromToday(group.key, today) : 0;
          const upcoming = daysAhead > 0;
          return (
            <section key={group.key} className="flex flex-col gap-1.5">
              <h3
                className={`flex items-baseline justify-between gap-3 px-1 text-xs tracking-wide uppercase ${
                  upcoming ? "font-bold text-foreground" : "font-medium text-foreground-secondary"
                }`}
              >
                <span>{dayLabel(group.key, today)}</span>
                {upcoming && (
                  <span className="normal-case">
                    Em {daysAhead} {daysAhead === 1 ? "dia" : "dias"}
                  </span>
                )}
              </h3>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {group.rows.map((row) => (
                  <div key={row.rowIndex}>{renderRow(row)}</div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
