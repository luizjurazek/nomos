"use client";

export type Scope = "period" | "month";

/** Global switch: do the summary and the categories describe the whole period or just the selected month? */
export function ScopeSwitch({
  scope,
  onChange,
  periodLabel,
  monthLabel,
}: {
  scope: Scope;
  onChange: (scope: Scope) => void;
  periodLabel: string;
  monthLabel: string | null;
}) {
  const options: { id: Scope; kind: string; label: string; disabled?: boolean }[] = [
    { id: "period", kind: "Período", label: periodLabel },
    { id: "month", kind: "Mês", label: monthLabel ?? "sem mês", disabled: monthLabel === null },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-xs text-foreground-secondary">Resumo e categorias mostram:</p>
      <div role="group" aria-label="Escopo" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:max-w-md">
        {options.map((option) => {
          const active = option.id === scope;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              disabled={option.disabled}
              onClick={() => onChange(option.id)}
              className={`flex min-w-0 flex-col rounded-xl px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                active ? "bg-background shadow-sm" : "text-foreground-secondary hover:bg-background/50"
              }`}
            >
              <span className="text-[11px] tracking-wide uppercase text-foreground-secondary">{option.kind}</span>
              <span className={`truncate text-sm ${active ? "font-semibold text-foreground" : "font-medium"}`}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
