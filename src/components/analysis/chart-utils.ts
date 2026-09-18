/** A "nice" y-axis for [min, max]: round tick values and a domain that snaps to them. */
export function niceScale(min: number, max: number, tickCount = 4): { lo: number; hi: number; ticks: number[] } {
  const span = max - min || 1;
  const rough = span / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks: number[] = [];
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(Math.round(value * 100) / 100);
  return { lo, hi, ticks };
}

/** Column path with a rounded top (data end) and a square base, per the chart mark spec (4px radius). */
export function columnPath(x: number, top: number, width: number, baseline: number, radius = 4): string {
  const height = baseline - top;
  const r = Math.min(radius, width / 2, height);
  return [
    `M${x},${baseline}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `L${x + width - r},${top}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `L${x + width},${baseline}`,
    "Z",
  ].join(" ");
}
