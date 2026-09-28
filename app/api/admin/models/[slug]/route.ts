import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { siteRoutes } from "../../../../../site-routes";
import { adminCookie, requestOriginIsAllowed, verifyAdminToken } from "../../../../admin-auth";
import { modelInputFromForm, mutateCatalog, removeManagedFile } from "../../../../catalog-store";
import type { CatalogModel } from "../../../../model-catalog-data";
import { notifyIndexNow } from "../../../../indexnow";

function authorized(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(adminCookie.name)?.value);
}

function responseError(error: unknown, status = 400) {
  return NextResponse.json({ message: error instanceof Error ? error.message : "Операция не выполнена." }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/admin/models/[slug]">) {
  if (!authorized(request)) return responseError(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return responseError(new Error("Запрос отклонён."), 403);

  let currentForCleanup: CatalogModel | undefined;
  let nextForCleanup: CatalogModel | undefined;
  let stored = false;

  try {
    const { slug } = await context.params;
    const formData = await request.formData();
    let previousModelFile: string | undefined;
    let previousImageFile: string | undefined;
    const updated = await mutateCatalog(async (models) => {
      const index = models.findIndex((item) => item.slug === slug);
      if (index < 0) throw new Error("Модель не найдена.");
      const current = models[index];
      currentForCleanup = current;
      const next = await modelInputFromForm(formData, current);
      nextForCleanup = next;
      if (next.slug !== slug && models.some((item) => item.slug === next.slug)) throw new Error("Модель с таким адресом уже существует.");
      if (next.model !== current.model) previousModelFile = current.model;
      if (next.image !== current.image) previousImageFile = current.image;
      models[index] = next;
      return next;
    });
    stored = true;
    await Promise.all([removeManagedFile(previousModelFile), removeManagedFile(previousImageFile)]);
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json({ model: updated });
  } catch (error) {
    if (!stored && nextForCleanup && currentForCleanup) {
      await Promise.all([
        nextForCleanup.model !== currentForCleanup.model ? removeManagedFile(nextForCleanup.model) : undefined,
        nextForCleanup.image !== currentForCleanup.image ? removeManagedFile(nextForCleanup.image) : undefined,
      ]);
    }
    return responseError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/admin/models/[slug]">) {
  if (!authorized(request)) return responseError(new Error("Требуется вход."), 401);
  if (!requestOriginIsAllowed(request)) return responseError(new Error("Запрос отклонён."), 403);

  try {
    const { slug } = await context.params;
    const removed = await mutateCatalog((models) => {
      const index = models.findIndex((item) => item.slug === slug);
      if (index < 0) throw new Error("Модель не найдена.");
      return models.splice(index, 1)[0];
    });
    await Promise.all([removeManagedFile(removed.model), removeManagedFile(removed.image)]);
    revalidatePath(siteRoutes.models);
    await notifyIndexNow([siteRoutes.models]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return responseError(error);
  }
}
