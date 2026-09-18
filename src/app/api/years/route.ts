import { NextResponse } from "next/server";
import { listAvailableYears } from "@/lib/sheets/spreadsheetRegistry";

export async function GET() {
  return NextResponse.json({ years: listAvailableYears() });
}
