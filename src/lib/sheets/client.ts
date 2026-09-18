import "server-only";
import { google, sheets_v4 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;
let cachedClient: sheets_v4.Sheets | null = null;

function getAuth() {
  if (cachedAuth) return cachedAuth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set.");
  }

  cachedAuth = new google.auth.JWT({
    email,
    // Env vars store the key with literal "\n" sequences; unescape them at runtime.
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return cachedAuth;
}

/** Returns a memoized Sheets API client. The same service account is shared across all years' spreadsheets. */
export function getSheetsClient(): sheets_v4.Sheets {
  if (!cachedClient) {
    cachedClient = google.sheets({ version: "v4", auth: getAuth() });
  }
  return cachedClient;
}
