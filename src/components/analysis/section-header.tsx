/** Title of a block plus a chip saying which slice of the data it describes, so the scope is never implicit. */
export function SectionHeader({ title, scope }: { title: string; scope: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground-secondary">{scope}</span>
    </header>
  );
}
