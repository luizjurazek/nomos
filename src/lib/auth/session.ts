import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = "90d"; // a private app for two people — no need to re-login often
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be set.");
  return new TextEncoder().encode(secret);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) throw new Error("APP_PASSWORD_HASH must be set.");
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
