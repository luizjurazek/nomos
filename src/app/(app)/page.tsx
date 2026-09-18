import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { listMonths } from "@/lib/sheets/listMonths";
import { getCurrentYearMonth, pickLandingMonth } from "@/lib/sheets/monthNames";
import { getSpreadsheetId, listAvailableYears } from "@/lib/sheets/spreadsheetRegistry";

/** Lands on the current month, falling back to the closest year/month that actually has a spreadsheet tab. */
export default async function AppIndexPage() {
  // The target depends on today's date, so this must never be prerendered at build time.
  await connection();

  const current = getCurrentYearMonth();
  const years = listAvailableYears();
  const year = years.includes(String(current.year)) ? String(current.year) : years[years.length - 1];
  if (!year) notFound();

  const months = await listMonths(getSpreadsheetId(year));
  // A year other than the current one (no sheet configured for it yet) lands on its last month.
  const targetMonthIndex = year === String(current.year) ? current.monthIndex : Number.MAX_SAFE_INTEGER - 1;
  const month = pickLandingMonth(months, targetMonthIndex);
  if (!month) notFound();

  redirect(`/${year}/${month}`);
}
