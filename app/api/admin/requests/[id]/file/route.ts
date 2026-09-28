import type { NextRequest } from "next/server";
import { adminCookie, verifyAdminToken } from "../../../../../admin-auth";
import { readSiteRequestAttachment } from "../../../../../request-store";

export const dynamic = "force-dynamic";

function contentDispositionFilename(filename: string) {
  const ascii = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: NextRequest, context: RouteContext<"/api/admin/requests/[id]/file">) {
  if (!verifyAdminToken(request.cookies.get(adminCookie.name)?.value)) {
    return Response.json({ message: "Требуется вход в админку." }, { status: 401 });
  }
  const { id } = await context.params;
  const attachment = await readSiteRequestAttachment(id).catch(() => null);
  if (!attachment?.request.attachment) return Response.json({ message: "Файл не найден." }, { status: 404 });
  return new Response(attachment.bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": attachment.request.attachment.mimeType || "application/octet-stream",
      "Content-Disposition": contentDispositionFilename(attachment.request.attachment.originalName),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
