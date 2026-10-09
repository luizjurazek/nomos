import "server-only";
import { fetchMonthGrids } from "./gridIO";
import { locateTables } from "./locateTables";
import type { SheetGrid } from "./types";

type LocatedTables = ReturnType<typeof locateTables>;

/** Much shorter than the display cache (30s): a stale position here means writing to the wrong row. */
const LOCATION_CACHE_TTL_MS = 5_000;

type Entry = { value: { raw: SheetGrid; located: LocatedTables }; expiresAt: number };

const cache = new Map<string, Entry>();
/** Bumped on every invalidation so a read that started before a write can't repopulate the cache afterwards. */
const generations = new Map<string, number>();

function keyOf(spreadsheetId: string, monthTitle: string): string {
  return `${spreadsheetId}:${monthTitle}`;
}

/**
 * Returns the month's raw grid and located tables, reusing an in-process read for a few seconds. Write paths only.
 * Pass `fresh` when the write depends on cell contents (e.g. picking blank slots), not just table positions.
 */
export async function getCachedLocation(
  spreadsheetId: string,
  monthTitle: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<{ raw: SheetGrid; located: LocatedTables }> {
  const key = keyOf(spreadsheetId, monthTitle);
  const hit = cache.get(key);
  if (!fresh && hit && hit.expiresAt > Date.now()) return hit.value;

  const generation = generations.get(key) ?? 0;
  const { formatted, raw } = await fetchMonthGrids(spreadsheetId, monthTitle);
  const value = { raw, located: locateTables(formatted) };

  if ((generations.get(key) ?? 0) === generation) {
    cache.set(key, { value, expiresAt: Date.now() + LOCATION_CACHE_TTL_MS });
  }
  return value;
}

/** Drops the month's cached positions. Call after any write attempt, including failed ones. */
export function invalidateLocation(spreadsheetId: string, monthTitle: string): void {
  const key = keyOf(spreadsheetId, monthTitle);
  cache.delete(key);
  generations.set(key, (generations.get(key) ?? 0) + 1);
}
