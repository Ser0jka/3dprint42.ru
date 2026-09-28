import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminCookie, createAdminToken, requestOriginIsAllowed, verifyAdminCredentials } from "../../../../admin-auth";
import { createTeamToken, teamCookie } from "../../../../team-auth";
import { authenticateTeamUser } from "../../../../team-store";

const attempts = new Map<string, number[]>();

function isLimited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 10;
}

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  if (isLimited(request)) return NextResponse.json({ message: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  const input = await request.json().catch(() => null) as { login?: unknown; password?: unknown } | null;
  const login = typeof input?.login === "string" ? input.login : "";
  const password = typeof input?.password === "string" ? input.password : "";
  if (verifyAdminCredentials(login, password)) {
    const response = NextResponse.json({ user: { id: "admin", name: "Администратор", status: "approved" } });
    response.cookies.set(adminCookie.name, createAdminToken(), adminCookie.options);
    response.cookies.set(teamCookie.name, "", { ...teamCookie.options, maxAge: 0 });
    return response;
  }
  const user = await authenticateTeamUser(login, password);
  if (!user) return NextResponse.json({ message: "Неверный логин или пароль." }, { status: 401 });
  const response = NextResponse.json({ user });
  response.cookies.set(teamCookie.name, createTeamToken(user.id), teamCookie.options);
  return response;
}
