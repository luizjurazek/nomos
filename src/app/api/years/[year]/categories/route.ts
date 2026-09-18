import { NextResponse } from "next/server";
import { getCategories } from "@/lib/sheets/categories";
import { getSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export async function GET(_request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  try {
    const spreadsheetId = getSpreadsheetId(year);
    const categories = await getCategories(spreadsheetId);
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ entradas: [], saidas: [] }, { status: 404 });
  }
}
