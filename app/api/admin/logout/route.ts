import { NextRequest, NextResponse } from "next/server";
import { adminCookie, requestOriginIsAllowed } from "../../../admin-auth";

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return NextResponse.json({ message: "Запрос отклонён." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return response;
}
