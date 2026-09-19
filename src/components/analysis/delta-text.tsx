import { formatDelta } from "@/lib/analysis/format";

/** Which way a figure has to move to be good news: spending going down is good, income going up is good. */
export type Better = "up" | "down";

/** "+R$ 500,00 · +12%" tinted green when the change is for the better and red when it is for the worse. */
export function DeltaText({ current, reference, better }: { current: number | null; reference: number | null; better: Better }) {
  const delta = formatDelta(current, reference);
  if (!delta) return <span>—</span>;
  // The sign is already in the text, so color is never the only cue.
  const tone = delta.direction === "flat" ? "" : delta.direction === better ? "text-success" : "text-destructive";
  return <span className={tone}>{delta.pct ? `${delta.abs} · ${delta.pct}` : delta.abs}</span>;
}
