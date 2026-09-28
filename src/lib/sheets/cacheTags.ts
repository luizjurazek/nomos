/** Cache tag for one month tab's cached grid reads; dropped whenever that month's sheet is written to. */
export function monthGridsCacheTag(year: string, month: string): string {
  return `month-grids:${year}:${month}`;
}
