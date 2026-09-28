import type { NextRequest } from "next/server";
import { adminCookie, verifyAdminToken } from "../../../admin-auth";
import { getSiteRequests } from "../../../request-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request.cookies.get(adminCookie.name)?.value)) {
    return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  }
  return Response.json({ requests: await getSiteRequests() }, { headers: { "Cache-Control": "no-store" } });
}
