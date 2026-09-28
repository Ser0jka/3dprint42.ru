import { NextRequest, NextResponse } from "next/server";
import { adminCookie, adminIsConfigured, createAdminToken, requestOriginIsAllowed, verifyAdminPassword } from "../../../admin-auth";

const attempts = new Map<string, number[]>();

function limited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 8;
}

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  if (!adminIsConfigured()) return NextResponse.json({ message: "Админка не настроена на сервере." }, { status: 503 });
  if (limited(request)) return NextResponse.json({ message: "Слишком много попыток. Попробуйте позже." }, { status: 429 });

  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password.slice(0, 256) : "";
  if (!verifyAdminPassword(password)) return NextResponse.json({ message: "Неверный пароль." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, createAdminToken(), adminCookie.options);
  return response;
}
