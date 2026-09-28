import type { Metadata } from "next";
import Link from "next/link";
import { siteRoutes } from "../../site-routes";
import { getCatalogModels } from "../catalog-store";
import ModelCatalog from "../model-catalog";
import { createMetadata } from "../seo";
import { SiteFooter, SiteHeader } from "../site-shell";
import StructuredData from "../structured-data";
import styles from "../catalog.module.css";

export const metadata: Metadata = createMetadata({
  title: "Каталог 3D-моделей для печати в Кемерово",
  description:
    "Готовые 3D-модели деталей, запчастей, креплений и изделий. Выберите модель и закажите 3D-печать в Кемерово.",
  path: siteRoutes.models,
  keywords: [
    "каталог 3д моделей",
    "3д модели для печати",
    "готовые модели для 3д принтера",
    "3д печать моделей Кемерово",
  ],
});

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const catalogModels = await getCatalogModels();
  const catalogCategories = [...new Set(catalogModels.map((model) => model.category))]
    .sort((a, b) => a.localeCompare(b, "ru"));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Каталог 3D-моделей для печати",
    url: `https://3dprint42.ru${siteRoutes.models}`,
    numberOfItems: catalogModels.length,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: catalogModels.length,
      itemListElement: catalogModels.slice(0, 24).map((model, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "3DModel",
          "@id": `https://3dprint42.ru${siteRoutes.models}#model-${model.slug}`,
          url: `https://3dprint42.ru${siteRoutes.models}#model-${model.slug}`,
          name: model.name,
          description: model.description,
          encodingFormat: model.model.toLowerCase().match(/\.(?:step|stp)$/) ? "model/step" : "model/stl",
          genre: model.category,
          ...(model.image ? { image: `https://3dprint42.ru${model.image}` } : {}),
        },
      })),
    },
  };

  return (
    <div className={styles.page}>
      <StructuredData data={structuredData} />
      <SiteHeader />
      <main>
        <section className={styles.hero} aria-labelledby="catalog-title">
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>КАТАЛОГ / {catalogModels.length} МОДЕЛИ</p>
              <h1 id="catalog-title">Каталог 3D-моделей</h1>
            </div>
            <div className={styles.heroAside}>
              <p>Выберите готовую модель — напечатаем её в Кемерово. Материал, цвет и размер уточним перед запуском.</p>
              <div className={styles.heroActions}>
                <a className={styles.primary} href="#models-heading">СМОТРЕТЬ МОДЕЛИ</a>
                <Link className={styles.secondary} href={`${siteRoutes.contact}#request`}>ЗАКАЗАТЬ СВОЮ</Link>
              </div>
              <dl>
                <div><dt>МОДЕЛЕЙ</dt><dd>{catalogModels.length}</dd></div>
                <div><dt>КАТЕГОРИЙ</dt><dd>{catalogCategories.length}</dd></div>
                <div><dt>СРОК</dt><dd>1–3 дня</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <ModelCatalog models={catalogModels} categories={catalogCategories} />

        <section className={styles.customCta}>
          <div>
            <span>НЕ НАШЛИ НУЖНУЮ МОДЕЛЬ?</span>
            <h2>Сделаем по образцу, фото или эскизу</h2>
          </div>
          <p>Пришлите то, что уже есть. Проверим задачу и подскажем, какие размеры или исходные данные понадобятся.</p>
          <Link href={`${siteRoutes.contact}#request`}>ОТПРАВИТЬ ЗАДАЧУ</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
