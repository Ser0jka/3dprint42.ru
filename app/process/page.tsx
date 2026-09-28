import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteRoutes } from "../../site-routes";
import styles from "../inner.module.css";
import { createMetadata } from "../seo";
import { processSteps } from "../site-content";
import { SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = createMetadata({
  title: "Процесс 3D-печати на заказ: от файла до детали",
  description:
    "Процесс заказа 3D-печати в Кемерово: передача файла или эскиза, проверка модели, выбор материала, производство и контроль готовых деталей.",
  path: siteRoutes.process,
  keywords: ["процесс 3д печати", "как заказать 3д печать", "этапы 3д печати"],
});

export default function ProcessPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>ПРОЦЕСС / 04 ЭТАПА</p>
              <h1>Как проходит заказ</h1>
            </div>
            <div>
              <p className={styles.heroLead}>Понятный маршрут без технологического тумана: фиксируем задачу, подготавливаем производство, печатаем и проверяем результат.</p>
              <div className={styles.heroActions}>
                <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>НАЧАТЬ С ЗАДАЧИ</Link>
                <Link className={styles.secondary} href={siteRoutes.services}>ВЫБРАТЬ УСЛУГУ</Link>
              </div>
            </div>
          </div>
          <div className={styles.imageStage}>
            <Image
              src="/media/process-design.jpg"
              alt="Инженер готовит 3D-модель к печати в мастерской"
              fill
              sizes="100vw"
              priority
            />
            <span className={styles.heroMeta}>MODEL → PRINT → OBJECT</span>
          </div>
        </section>

        <nav className={styles.indexBand} aria-label="Этапы работы">
          {processSteps.map((step) => <a href={`#${step.id}`} key={step.id}>{step.number} / {step.title}</a>)}
        </nav>

        <section className={`${styles.content} ${styles.section}`}>
          <ol className={styles.processGrid}>
            {processSteps.map((step) => (
              <li className={styles.processStep} id={step.id} key={step.id}>
                <span className={styles.sectionNumber}>{step.number}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.content} ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>05</span>
            <h2>ЧТО ВЛИЯЕТ НА ОЦЕНКУ</h2>
            <p className={styles.sectionLead}>Объём материала — только одна часть. Важны машинное время, ориентация, поддержки, постобработка и количество повторов.</p>
          </div>
          <div className={styles.routeGrid}>
            <Link className={styles.routeCard} href={siteRoutes.materials}><span className={styles.routeLabel}>01 / МАТЕРИАЛ</span><h3>СВОЙСТВА И СРЕДА</h3><p>PLA, PETG, ABS или TPU под функцию детали.</p></Link>
            <Link className={styles.routeCard} href={siteRoutes.services}><span className={styles.routeLabel}>02 / ТИП РАБОТЫ</span><h3>ПРОТОТИП ИЛИ СЕРИЯ</h3><p>Разный подход к одной детали и повторяемой партии.</p></Link>
            <Link className={styles.routeCard} href={`${siteRoutes.contact}#request`}><span className={styles.routeLabel}>03 / ИСХОДНЫЕ ДАННЫЕ</span><h3>ФАЙЛ ИЛИ ЭСКИЗ</h3><p>Передайте то, что уже есть — уточним остальное.</p></Link>
          </div>
        </section>

        <section className={styles.conversion}>
          <h2>ГОТОВЫ ПЕРЕДАТЬ ИСХОДНЫЕ ДАННЫЕ?</h2>
          <div className={styles.conversionLinks}><Link className={styles.primary} href={`${siteRoutes.contact}#request`}>ЗАПОЛНИТЬ ФОРМУ</Link><Link className={styles.textLink} href={siteRoutes.cases}>СМОТРЕТЬ ЗАДАЧИ</Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
