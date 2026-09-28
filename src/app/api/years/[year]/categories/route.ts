import { NextResponse } from "next/server";
import { getCategories } from "@/lib/sheets/categories";
import { getCategoriesSpreadsheetId } from "@/lib/sheets/spreadsheetRegistry";

export async function GET(_request: Request, _context: { params: Promise<{ year: string }> }) {
  try {
    const categories = await getCategories(getCategoriesSpreadsheetId());
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ entradas: [], saidas: [] }, { status: 404 });
  }
}
