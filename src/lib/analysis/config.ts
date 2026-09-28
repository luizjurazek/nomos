import "server-only";
import { toNumber } from "../format/currency";

/**
 * The savings balance from before this app existed. Set via the INITIAL_SAVINGS_BALANCE env var
 * (a fixed value that never changes) instead of a "Config" tab lookup, to avoid a Sheets API call
 * on every read. Kept outside every month tab so it never gets attached to, or skews the stats of,
 * any month. 0 when unset.
 */
export async function getInitialSavingsBalance(): Promise<number> {
  return toNumber(process.env.INITIAL_SAVINGS_BALANCE);
}
