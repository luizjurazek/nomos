import { AnalysisView } from "@/components/analysis/analysis-view";
import { getInitialSavingsBalance } from "@/lib/analysis/config";
import { currentMonthNow } from "@/lib/analysis/months";
import { readAllYears } from "@/lib/analysis/readAllYears";

// Render on every request: no spreadsheet read at build time and no frozen "current month". The
// cached read in `readAllYears` (1 minute) is what protects the Sheets API quota.
export const dynamic = "force-dynamic";

export default async function AnalisePage() {
  const [months, initialBalance] = await Promise.all([readAllYears(), getInitialSavingsBalance().catch(() => 0)]);
  return <AnalysisView months={months} now={currentMonthNow()} initialBalance={initialBalance} />;
}
