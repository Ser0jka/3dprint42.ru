import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "3dprint42_team";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function secret() {
  const value = process.env.TEAM_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim() || "";
  if (value.length >= 32) return value;
  return process.env.NODE_ENV === "development" ? "development-only-team-session-secret-3dprint42" : "";
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string) {
  const key = secret();
  return key ? createHmac("sha256", key).update(payload).digest("base64url") : "";
}

export function createTeamToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyTeamToken(token: string | undefined) {
  if (!token || !secret()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string; exp?: number };
    return typeof value.userId === "string" && typeof value.exp === "number" && value.exp > Date.now() ? value.userId : null;
  } catch {
    return null;
  }
}

export async function teamSessionUserId() {
  return verifyTeamToken((await cookies()).get(COOKIE_NAME)?.value);
}

export const teamCookie = {
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
