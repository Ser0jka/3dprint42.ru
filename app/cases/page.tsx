import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteRoutes } from "../../site-routes";
import styles from "../inner.module.css";
import { createMetadata } from "../seo";
import { useCases } from "../site-content";
import { SiteFooter, SiteHeader } from "../site-shell";

const imagesByCase: Record<(typeof useCases)[number]["id"], { src: string; alt: string }> = {
  replacement: {
    src: "/media/case-replacement.jpg",
    alt: "Напечатанная деталь со сложной внутренней структурой",
  },
  validation: {
    src: "/media/case-validation.jpg",
    alt: "3D-принтер изготавливает тестовый прототип",
  },
  tooling: {
    src: "/media/case-tooling.jpg",
    alt: "Печать деталей со сложным внутренним заполнением",
  },
  batch: {
    src: "/media/case-batch.jpg",
    alt: "Инженер готовит небольшую серию изделий в мастерской",
  },
};

export const metadata: Metadata = createMetadata({
  title: "Примеры 3D-печати деталей и прототипов",
  description:
    "Когда подходит 3D-печать: замена снятых с производства деталей, проверка прототипов, изготовление оснастки и выпуск малых серий в Кемерово.",
  path: siteRoutes.cases,
  keywords: ["примеры 3д печати", "3д печать деталей", "изделия на 3д принтере"],
});

export default function CasesPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>ЗАДАЧИ / ПРИМЕНЕНИЕ</p>
              <h1>Примеры 3D-печати</h1>
            </div>
            <div>
              <p className={styles.heroLead}>Аддитивное производство особенно полезно там, где нужна нестандартная геометрия, один экземпляр, быстрая итерация или небольшая партия.</p>
              <div className={styles.heroActions}>
                <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>РАЗОБРАТЬ ЗАДАЧУ</Link>
                <Link className={styles.secondary} href={siteRoutes.services}>ВСЕ УСЛУГИ</Link>
              </div>
            </div>
          </div>
        </section>

        <nav className={styles.indexBand} aria-label="Типовые задачи">
          {useCases.map((item) => <a href={`#${item.id}`} key={item.id}>{item.number} / {item.title}</a>)}
        </nav>

        <section className={`${styles.content} ${styles.caseGrid}`}>
          {useCases.map((item) => (
            <article className={styles.caseCard} id={item.id} key={item.id}>
              <Link className={styles.caseCardLink} href={item.route}>
                <div className={styles.caseImage}>
                  <Image
                    src={imagesByCase[item.id].src}
                    alt={imagesByCase[item.id].alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
                  />
                </div>
                <div className={styles.caseCaption}>
                  <span>{item.number}</span>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <span className={styles.textLink}>ПОДХОДЯЩАЯ УСЛУГА</span>
                </div>
              </Link>
            </article>
          ))}
        </section>

        <section className={styles.conversion}>
          <h2>НЕ НАШЛИ СВОЙ СЦЕНАРИЙ?</h2>
          <div className={styles.conversionLinks}>
            <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>ОПИСАТЬ СВОЙ</Link>
            <Link className={styles.textLink} href={siteRoutes.materials}>СРАВНИТЬ МАТЕРИАЛЫ</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
