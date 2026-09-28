import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requestOriginIsAllowed } from "../../../../admin-auth";
import { teamCookie } from "../../../../team-auth";

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(teamCookie.name, "", { ...teamCookie.options, maxAge: 0 });
  return response;
}
