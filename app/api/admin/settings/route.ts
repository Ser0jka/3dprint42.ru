import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { adminCookie, requestOriginIsAllowed, verifyAdminToken } from "../../../admin-auth";
import { getSiteSettings, parseSiteSettings, updateSiteSettings } from "../../../site-settings-store";
import { notifyIndexNow } from "../../../indexnow";
import { siteRoutes } from "../../../../site-routes";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "Не удалось сохранить настройки." }, { status });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  return NextResponse.json({ settings: await getSiteSettings({ requestTime: false }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return errorResponse(new Error("Запрос отклонён."), 403);
  try {
    const settings = parseSiteSettings(await request.json());
    await updateSiteSettings(settings);
    revalidatePath("/", "layout");
    await notifyIndexNow([siteRoutes.home, siteRoutes.contact]);
    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
