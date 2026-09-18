import "server-only";

/**
 * Maps a year to its Google Spreadsheet ID. Each year lives in its own spreadsheet
 * (the couple migrated mid-2026, so that year's sheet only has Junho–Dezembro tabs;
 * 2027 onward will be separate spreadsheets, not new tabs in the same file).
 *
 * Configured via GOOGLE_SPREADSHEET_IDS, a JSON object like {"2026": "<id>", "2027": "<id>"}.
 */
function loadRegistry(): Record<string, string> {
  const raw = process.env.GOOGLE_SPREADSHEET_IDS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
  } catch {
    // Fall through to empty registry; callers surface a clear "year not configured" error.
  }
  return {};
}

let cachedRegistry: Record<string, string> | null = null;

function getRegistry(): Record<string, string> {
  if (!cachedRegistry) cachedRegistry = loadRegistry();
  return cachedRegistry;
}

export function listAvailableYears(): string[] {
  return Object.keys(getRegistry()).sort();
}

export function getSpreadsheetId(year: string): string {
  const id = getRegistry()[year];
  if (!id) {
    throw new Error(`No spreadsheet configured for year "${year}". Check GOOGLE_SPREADSHEET_IDS.`);
  }
  return id;
}

/** The most recent year that has a spreadsheet configured, used as the default landing year. */
export function getLatestAvailableYear(): string | null {
  const years = listAvailableYears();
  return years.length > 0 ? years[years.length - 1] : null;
}
