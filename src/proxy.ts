import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await verifySessionToken(token);
  if (authenticated) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Run on every route except the login page itself, static assets, and
     * Next.js internals — otherwise the login page's own CSS/JS gets blocked.
     */
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.json|icons).*)",
  ],
};
