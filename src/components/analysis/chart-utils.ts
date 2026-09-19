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

/**
 * Column path with a rounded data end and a square base, per the chart mark spec (4px radius). `end` is the y of
 * the data end: above the baseline for a positive value (the bar grows up), below it for a negative one (down).
 */
export function columnPath(x: number, end: number, width: number, baseline: number, radius = 4): string {
  const down = end > baseline;
  const r = Math.min(radius, width / 2, Math.abs(baseline - end));
  const inner = down ? end - r : end + r;
  return [
    `M${x},${baseline}`,
    `L${x},${inner}`,
    `Q${x},${end} ${x + r},${end}`,
    `L${x + width - r},${end}`,
    `Q${x + width},${end} ${x + width},${inner}`,
    `L${x + width},${baseline}`,
    "Z",
  ].join(" ");
}
