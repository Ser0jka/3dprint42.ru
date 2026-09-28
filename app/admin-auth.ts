import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "3dprint42_admin";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function configuredPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password) return password;
  return process.env.NODE_ENV === "development" ? "admin" : "";
}

function configuredLogin() {
  const login = process.env.ADMIN_LOGIN?.trim().toLowerCase();
  if (login) return login;
  return process.env.NODE_ENV === "development" ? "admin" : "";
}

function sessionSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;

  const password = configuredPassword();
  return process.env.NODE_ENV === "development" && password
    ? `development-only-3dprint42-${password}`
    : "";
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(payload: string) {
  const secret = sessionSecret();
  return secret ? createHmac("sha256", secret).update(payload).digest("base64url") : "";
}

export function adminIsConfigured() {
  return Boolean(configuredPassword() && sessionSecret());
}

export function verifyAdminPassword(password: string) {
  const expected = configuredPassword();
  return Boolean(expected) && safeEqual(password, expected);
}

export function verifyAdminCredentials(login: string, password: string) {
  const expectedLogin = configuredLogin();
  return Boolean(expectedLogin) && safeEqual(login.trim().toLowerCase(), expectedLogin) && verifyAdminPassword(password);
}

export function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminToken(token: string | undefined) {
  if (!token || !adminIsConfigured()) return false;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature || !safeEqual(receivedSignature, signature(payload))) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  return verifyAdminToken((await cookies()).get(COOKIE_NAME)?.value);
}

export const adminCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high" as const,
  },
};

export function requestOriginIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
