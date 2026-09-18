"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/format/dayGroups";

const subscribe = () => () => {};

/**
 * Today's local day as "yyyy-MM-dd", or null during server render and hydration. The server runs in
 * another timezone, so reading the clock while rendering would mismatch the client around midnight.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => todayKey(), () => null);
}
