import type { NextRequest } from "next/server";
import { dashboardActor } from "../../../../dashboard-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return Response.json({ actor: await dashboardActor(request) }, { headers: { "Cache-Control": "no-store" } });
}
