import type { ReactNode } from "react";

interface TableSectionHeaderProps {
  title: string;
  count: number;
  /** Explains the interactive bits of the list, e.g. what tapping the status pill does. */
  hint?: string;
  action?: ReactNode;
}

/** Header shown above each detailed list: what it is, how many rows, and how to use the status pill. */
export function TableSectionHeader({ title, count, hint, action }: TableSectionHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">
          {title} <span className="text-sm font-normal text-foreground-secondary">· {count}</span>
        </h2>
        {hint && <p className="text-xs text-foreground-secondary">{hint}</p>}
      </div>
      {action}
    </header>
  );
}
