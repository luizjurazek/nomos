"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ANALYSIS_CACHE_TAG } from "@/lib/analysis/readAllYears";
import type { PendingInstallment } from "@/lib/sheets/carryOver";
import { planPendingInstallments, writePendingInstallments } from "@/lib/sheets/carryOverPlan";

/** Drops the cached spreadsheet read so the next render of /analise fetches fresh data. */
export async function refreshAnalysis(): Promise<void> {
  updateTag(ANALYSIS_CACHE_TAG);
  revalidatePath("/analise");
}

/** What carrying the running installments over would write, without writing anything. */
export async function previewPendingInstallments(): Promise<PendingInstallment[]> {
  return planPendingInstallments();
}

/**
 * Carries the running installments (Entradas, Débitos, Nubank) into the months that do not have them yet.
 * The plan is recomputed here instead of taken from the client, so it always matches the sheet as it is now.
 */
export async function applyPendingInstallments(): Promise<{ created: number; error: string | null }> {
  const items = await planPendingInstallments();
  const result = await writePendingInstallments(items);
  if (result.created > 0) {
    for (const item of items.slice(0, result.created)) revalidatePath(`/${item.year}/${item.month}`);
    updateTag(ANALYSIS_CACHE_TAG);
    revalidatePath("/analise");
  }
  return result;
}
