/** Skeleton while every month of every year is read from Google Sheets. */
export default function AnaliseLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-label="Carregando a análise">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-28 rounded bg-muted" />
        <div className="h-4 w-52 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        {[20, 40, 16].map((width, index) => (
          <div key={index} className="h-9 rounded-full bg-muted" style={{ width: `${width * 4}px` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-20 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
      <div className="h-48 rounded-2xl bg-muted" />
    </div>
  );
}
