import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { siteRoutes } from "../../../../site-routes";
import { adminCookie, requestOriginIsAllowed, verifyAdminToken } from "../../../admin-auth";
import { addCatalogCategory, deleteCatalogCategory, getCatalogCategories, renameCatalogCategory } from "../../../catalog-store";
import { notifyIndexNow } from "../../../indexnow";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "Не удалось изменить категории." }, { status });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  return NextResponse.json({ categories: await getCatalogCategories() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return errorResponse(new Error("Запрос отклонён."), 403);
  try {
    const input = await request.json() as { name?: string };
    const categories = await addCatalogCategory(input.name || "");
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json({ categories }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return errorResponse(new Error("Запрос отклонён."), 403);
  try {
    const input = await request.json() as { previousName?: string; nextName?: string };
    const result = await renameCatalogCategory(input.previousName || "", input.nextName || "");
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return errorResponse(new Error("Запрос отклонён."), 403);
  try {
    const input = await request.json() as { name?: string };
    const categories = await deleteCatalogCategory(input.name || "");
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}
