import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { materialRoutes, siteRoutes } from "../../site-routes";
import styles from "../inner.module.css";
import { createMetadata } from "../seo";
import { materials } from "../site-content";
import { SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = createMetadata({
  title: "Пластик для 3D-печати: PLA, PETG, ABS и TPU",
  description:
    "Сравнение PLA, PETG, ABS и TPU для 3D-печати: свойства, ограничения и применение. Подберём материал под нагрузку, температуру и среду эксплуатации.",
  path: siteRoutes.materials,
  keywords: ["пластик для 3д печати", "материалы для 3д печати", "филамент для 3д принтера"],
});

export default function MaterialsPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>МАТЕРИАЛЫ / 04 СИСТЕМЫ</p>
              <h1>Материалы для 3D-печати</h1>
            </div>
            <div>
              <p className={styles.heroLead}>Материал выбирается по нагрузке, температуре, влажности, гибкости и требуемой поверхности. Если выбор неочевиден — начнём с функции детали.</p>
              <div className={styles.heroActions}>
                <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>ПОДОБРАТЬ МАТЕРИАЛ</Link>
                <Link className={styles.secondary} href={siteRoutes.services}>СМОТРЕТЬ УСЛУГИ</Link>
              </div>
            </div>
          </div>
          <div className={styles.imageStage}>
            <Image
              src="/media/materials-filament.jpg"
              alt="Яркие катушки филамента для 3D-печати"
              fill
              sizes="100vw"
              priority
            />
            <span className={styles.heroMeta}>PLA / PETG / ABS / TPU</span>
          </div>
        </section>

        <nav className={styles.indexBand} aria-label="Материалы">
          {materials.map((material) => <Link href={materialRoutes[material.id]} key={material.id}>{material.code}</Link>)}
        </nav>

        <section className={`${styles.content} ${styles.section}`}>
          <div className={styles.materialList}>
            {materials.map((material, index) => (
              <details className={styles.materialItem} id={material.id} key={material.id} open={index === 1}>
                <summary>
                  <span className={styles.materialCode}>{material.code}</span>
                  <h2>{material.use}</h2>
                  <p>{material.description}</p>
                  <i className={styles.plus} aria-hidden="true" />
                </summary>
                <div className={styles.materialBody}>
                  <p>{material.notFor}</p>
                  <ul>{material.properties.map((property) => <li key={property}>{property}</li>)}</ul>
                  <Link className={styles.textLink} href={materialRoutes[material.id]}>ПОДРОБНЕЕ О МАТЕРИАЛЕ</Link>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.conversion}>
          <h2>НЕ УВЕРЕНЫ В МАТЕРИАЛЕ?</h2>
          <div className={styles.conversionLinks}>
            <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>ОПИСАТЬ НАГРУЗКУ</Link>
            <Link className={styles.textLink} href={siteRoutes.cases}>ПОСМОТРЕТЬ ЗАДАЧИ</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
