import type { NextRequest } from "next/server";
import { dashboardActor } from "../../../../../dashboard-auth";
import { readSiteRequestAttachment } from "../../../../../request-store";
import { getWorkspaceState } from "../../../../../workspace-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/api/dashboard/orders/[id]/attachment">) {
  const actor = await dashboardActor(request);
  if (!actor || actor.status !== "approved") return Response.json({ message: "Требуется вход." }, { status: 401 });
  const { id } = await context.params;
  const order = (await getWorkspaceState()).orders.find((item) => item.id === id);
  if (!order?.requestId) return Response.json({ message: "Файл не найден." }, { status: 404 });
  const attachment = await readSiteRequestAttachment(order.requestId).catch(() => null);
  if (!attachment) return Response.json({ message: "Файл не найден." }, { status: 404 });
  const safeName = attachment.request.attachment?.originalName.replace(/["\r\n]/g, "") || "attachment";
  return new Response(new Uint8Array(attachment.bytes), {
    headers: {
      "Content-Type": attachment.request.attachment?.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
