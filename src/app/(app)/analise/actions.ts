"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ANALYSIS_CACHE_TAG } from "@/lib/analysis/readAllYears";

/** Drops the cached spreadsheet read so the next render of /analise fetches fresh data. */
export async function refreshAnalysis(): Promise<void> {
  updateTag(ANALYSIS_CACHE_TAG);
  revalidatePath("/analise");
}
