/** Skeleton shown while a month is read from Google Sheets, so switching months never looks frozen. */
export default function MonthLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-busy="true" aria-label="Carregando o mês">
      <div className="h-36 rounded-3xl bg-muted" />
      <div className="h-14 rounded-2xl bg-muted" />
      <div className="h-12 rounded-2xl bg-muted" />
      <div className="flex gap-2 py-2">
        {[24, 20, 32, 20].map((width, index) => (
          <div key={index} className="h-9 rounded-full bg-muted" style={{ width: `${width * 4}px` }} />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <div className="size-10 rounded-full bg-muted" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
