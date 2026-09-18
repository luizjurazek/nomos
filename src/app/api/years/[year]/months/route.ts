import { NextResponse } from "next/server";
import { listMonths } from "@/lib/sheets/listMonths";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export async function GET(_request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  try {
    const spreadsheetId = getSpreadsheetId(year);
    const months = await listMonths(spreadsheetId);
    return NextResponse.json({ months });
  } catch {
    return NextResponse.json({ months: [] }, { status: 404 });
  }
}
