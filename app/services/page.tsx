import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { serviceRoutes, siteRoutes } from "../../site-routes";
import styles from "../inner.module.css";
import { createMetadata } from "../seo";
import { services } from "../site-content";
import { SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = createMetadata({
  title: "3D-печать на заказ в Кемерово: услуги и цены",
  description:
    "3D-печать, 3D-моделирование, реверс-инжиниринг и 3D-сканирование в Кемерово. Работаем с файлами, эскизами и физическими образцами.",
  path: siteRoutes.services,
  keywords: ["3д печать на заказ", "услуги 3д печати", "печать на 3д принтере на заказ"],
});

export default function ServicesPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>УСЛУГИ / ПОЛНЫЙ ЦИКЛ</p>
              <h1>Услуги 3D-печати</h1>
            </div>
            <div>
              <p className={styles.heroLead}>От единичной функциональной детали до повторяемой партии. Не продаём «пластик по граммам» — сначала разбираем функцию изделия.</p>
              <div className={styles.heroActions}>
                <Link className={styles.primary} href={siteRoutes.quiz}>РАССЧИТАТЬ СТОИМОСТЬ</Link>
                <Link className={styles.secondary} href={siteRoutes.materials}>ВЫБРАТЬ МАТЕРИАЛ</Link>
              </div>
            </div>
          </div>
          <div className={styles.imageStage}>
            <Image
              src="/media/services-production.jpg"
              alt="Оборудованная мастерская для 3D-печати и сборки деталей"
              fill
              sizes="100vw"
              priority
            />
            <span className={styles.heroMeta}>FDM / МАЛАЯ СЕРИЯ / 42</span>
          </div>
        </section>

        <nav className={styles.indexBand} aria-label="Услуги">
          {services.map((service) => <Link href={serviceRoutes[service.id]} key={service.id}>{service.number} / {service.title}</Link>)}
        </nav>

        <div className={`${styles.content} ${styles.serviceCatalog}`}>
          {services.map((service) => (
            <section className={`${styles.section} ${styles.serviceSection}`} id={service.id} key={service.id}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>{service.number}</span>
                <h2><Link href={serviceRoutes[service.id]}>{service.title}</Link></h2>
                <span className={styles.serviceMeta}>{service.meta}</span>
                <p className={styles.sectionLead}>{service.lead}</p>
              </div>
              <p className={styles.serviceDescription}>{service.description}</p>
              <div className={styles.serviceFacts}>
                <div>
                  <h3>ЧТО ПРОИЗВОДИМ</h3>
                  <ul>{service.includes.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3>ПОДХОДИТ ДЛЯ</h3>
                  <ul>{service.suitableFor.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3>ЧТО ПРИСЛАТЬ</h3>
                  <ul>{service.source.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3>УЧИТЫВАЕМ</h3>
                  <ul>{service.considerations.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <div className={styles.sectionRoute}>
                <Link className={styles.textLink} href={serviceRoutes[service.id]}>ПОДРОБНЕЕ ОБ УСЛУГЕ</Link>
                <Link className={styles.textLink} href={`${siteRoutes.contact}#request`}>ОБСУДИТЬ ЗАДАЧУ</Link>
              </div>
            </section>
          ))}
        </div>

        <section className={styles.conversion}>
          <h2>ЕСТЬ ФАЙЛ ИЛИ ТОЛЬКО ИДЕЯ?</h2>
          <div className={styles.conversionLinks}>
            <Link className={styles.primary} href={`${siteRoutes.contact}#request`}>ПЕРЕДАТЬ ЗАДАЧУ</Link>
            <Link className={styles.textLink} href={siteRoutes.process}>КАК ПРОХОДИТ РАБОТА</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
