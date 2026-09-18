import { notFound, redirect } from "next/navigation";
import { listMonths } from "@/lib/sheets/listMonths";
import { getLatestAvailableYear, getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

/** Lands on the most recent year/month that has a spreadsheet and at least one month tab configured. */
export default async function AppIndexPage() {
  const year = getLatestAvailableYear();
  if (!year) notFound();

  const spreadsheetId = getSpreadsheetId(year);
  const months = await listMonths(spreadsheetId);
  const month = months[months.length - 1];
  if (!month) notFound();

  redirect(`/${year}/${month}`);
}
