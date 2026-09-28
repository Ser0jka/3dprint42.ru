import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { siteRoutes } from "../../../../site-routes";
import { requestOriginIsAllowed, verifyAdminToken, adminCookie } from "../../../admin-auth";
import { getCatalogModels, modelInputFromForm, mutateCatalog, removeManagedFile } from "../../../catalog-store";
import type { CatalogModel } from "../../../model-catalog-data";
import { notifyIndexNow } from "../../../indexnow";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "Не удалось сохранить модель." }, { status });
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  return NextResponse.json({ models: await getCatalogModels() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return errorResponse(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return errorResponse(new Error("Запрос отклонён."), 403);

  let model: CatalogModel | undefined;
  let stored = false;

  try {
    const formData = await request.formData();
    const parsedModel = await modelInputFromForm(formData);
    model = parsedModel;
    await mutateCatalog((models) => {
      if (models.some((item) => item.slug === parsedModel.slug)) throw new Error("Модель с таким адресом уже существует.");
      models.unshift(parsedModel);
    });
    stored = true;
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    if (model && !stored) await Promise.all([removeManagedFile(model.model), removeManagedFile(model.image)]);
    return errorResponse(error);
  }
}
