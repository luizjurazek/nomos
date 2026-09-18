"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth/session";

export async function login(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/");

  if (!(await verifyPassword(password))) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, await createSessionToken(), sessionCookieOptions());

  redirect(from || "/");
}
