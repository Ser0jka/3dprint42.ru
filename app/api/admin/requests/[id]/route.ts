import type { NextRequest } from "next/server";
import { adminCookie, requestOriginIsAllowed, verifyAdminToken } from "../../../../admin-auth";
import { deleteSiteRequest, updateSiteRequestStatus, type SiteRequestStatus } from "../../../../request-store";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/requests/[id]">) {
  if (!authorized(request)) return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  if (!requestOriginIsAllowed(request)) return Response.json({ message: "Запрос отклонён." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({})) as { status?: SiteRequestStatus };
  if (!body.status || !["new", "in_progress", "completed"].includes(body.status)) {
    return Response.json({ message: "Неизвестный статус заявки." }, { status: 400 });
  }
  try {
    return Response.json({ request: await updateSiteRequestStatus(id, body.status) });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Не удалось обновить заявку." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/admin/requests/[id]">) {
  if (!authorized(request)) return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  if (!requestOriginIsAllowed(request)) return Response.json({ message: "Запрос отклонён." }, { status: 403 });
  const { id } = await context.params;
  try {
    await deleteSiteRequest(id);
    return Response.json({ message: "Заявка и вложение удалены." });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Не удалось удалить заявку." }, { status: 404 });
  }
}
