"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { catalogModelFormat, type CatalogModel } from "./model-catalog-data";
import ModelCardPreview from "./model-card-preview";
import { reachMetrikaGoal } from "./metrika-goals";
import styles from "./catalog.module.css";

const PAGE_SIZE = 24;
const ModelFileViewer = dynamic(() => import("./stl-model-viewer"), {
  ssr: false,
  loading: () => (
    <div className={styles.viewerBackdrop} role="status" aria-live="polite">
      <div className={styles.viewerBootstrap}>
        <span>ОТКРЫВАЕМ МОДЕЛЬ</span>
        <b>3D</b>
      </div>
    </div>
  ),
});

type ModelCatalogProps = {
  models: readonly CatalogModel[];
  categories: readonly string[];
};

function normalize(value: string) {
  return value.toLocaleLowerCase("ru").replaceAll("ё", "е");
}

function displayName(value: string) {
  return value.charAt(0).toLocaleUpperCase("ru") + value.slice(1);
}

export default function ModelCatalog({ models, categories }: ModelCatalogProps) {
  const [category, setCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);

  const filteredModels = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return models.filter((model) => {
      const matchesCategory = category === "Все" || model.category === category;
      const searchable = normalize(`${model.name} ${model.category} ${model.description}`);
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, models, query]);

  const visibleModels = filteredModels.slice(0, visibleCount);

  const openModel = (model: CatalogModel) => {
    reachMetrikaGoal("catalog_model_open", {
      model: model.slug,
      category: model.category,
      format: catalogModelFormat(model),
    });
    setSelectedModel(model);
  };

  return (
    <section className={styles.catalog} aria-labelledby="models-heading">
      <div className={styles.catalogToolbar}>
        <div>
          <p className={styles.toolbarLabel} id="models-heading">ГОТОВЫЕ МОДЕЛИ</p>
          <p className={styles.resultCount} aria-live="polite">Найдено: {filteredModels.length}</p>
        </div>
        <label className={styles.search}>
          <span>ПОИСК ПО КАТАЛОГУ</span>
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Например, шестерня или крепёж"
          />
        </label>
      </div>

      <div className={styles.filters} aria-label="Категории моделей">
        {["Все", ...categories].map((item) => (
          <button
            type="button"
            data-active={category === item}
            aria-pressed={category === item}
            onClick={() => { setCategory(item); setVisibleCount(PAGE_SIZE); }}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>

      {visibleModels.length > 0 ? (
        <div className={styles.modelGrid}>
          {visibleModels.map((model, index) => {
            const format = catalogModelFormat(model);
            return (
              <button
                className={styles.modelCard}
                id={`model-${model.slug}`}
                type="button"
                onClick={() => openModel(model)}
                key={model.slug}
              >
                <div className={styles.modelImage}>
                  {model.image ? (
                    <Image
                      src={model.image}
                      alt={`${displayName(model.name)} — готовая 3D-модель для печати`}
                      fill
                      unoptimized={model.image.startsWith("/catalog-files/")}
                      sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, (max-width: 1440px) 33vw, 25vw"
                    />
                  ) : (
                    <ModelCardPreview model={model} />
                  )}
                  <span>{String(index + 1).padStart(3, "0")}</span>
                </div>
                <div className={styles.modelInfo}>
                  <span>{model.category}</span>
                  <h2>{displayName(model.name)}</h2>
                  <p>{model.material}</p>
                  <div><b>от {model.price.toLocaleString("ru-RU")} ₽</b><span>{format === "STL" ? "СМОТРЕТЬ В 3D →" : "ОТКРЫТЬ STEP →"}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>Ничего не найдено</h2>
          <p>Попробуйте изменить запрос или выбрать другую категорию.</p>
          <button type="button" onClick={() => { setCategory("Все"); setQuery(""); }}>СБРОСИТЬ ФИЛЬТРЫ</button>
        </div>
      )}

      {visibleCount < filteredModels.length && (
        <button className={styles.loadMore} type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          ПОКАЗАТЬ ЕЩЁ {Math.min(PAGE_SIZE, filteredModels.length - visibleCount)}
        </button>
      )}

      {selectedModel && <ModelFileViewer model={selectedModel} onClose={() => setSelectedModel(null)} />}
    </section>
  );
}
