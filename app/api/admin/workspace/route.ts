import type { NextRequest } from "next/server";
import { adminCookie, requestOriginIsAllowed, verifyAdminToken } from "../../../admin-auth";
import { getSiteRequests } from "../../../request-store";
import { applyWorkspaceAction, getWorkspaceState, syncSiteRequestsToWorkspace } from "../../../workspace-store";
import type { WorkspaceAction } from "../../../workspace-types";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  await syncSiteRequestsToWorkspace(await getSiteRequests());
  return Response.json({ workspace: await getWorkspaceState() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  if (!requestOriginIsAllowed(request)) return Response.json({ message: "Запрос отклонён." }, { status: 403 });

  const action = await request.json().catch(() => null) as WorkspaceAction | null;
  if (!action?.type) return Response.json({ message: "Не указано действие." }, { status: 400 });

  try {
    const workspace = await applyWorkspaceAction(action);
    return Response.json({ workspace });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Не удалось обновить производство." }, { status: 400 });
  }
}

