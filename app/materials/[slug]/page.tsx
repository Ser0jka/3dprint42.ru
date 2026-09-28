import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { materialRoutes, serviceRoutes, siteRoutes } from "../../../site-routes";
import ProjectRequestForm from "../../project-request-form";
import styles from "../../inner.module.css";
import { createMetadata, siteUrl } from "../../seo";
import { materialSeo } from "../../seo-pages";
import type { ServiceId } from "../../site-content";
import { materials, services } from "../../site-content";
import { SiteFooter, SiteHeader } from "../../site-shell";
import StructuredData from "../../structured-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return materials.map((material) => ({ slug: material.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const material = materials.find((item) => item.id === slug);

  if (!material) {
    return {};
  }

  const seo = materialSeo[material.id];

  return createMetadata({ ...seo, path: materialRoutes[material.id] });
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const material = materials.find((item) => item.id === slug);

  if (!material) {
    notFound();
  }

  const relatedServiceIds: readonly ServiceId[] = material.relatedServices;
  const relatedServices = services.filter((service) =>
    relatedServiceIds.includes(service.id),
  );
  const pageUrl = `${siteUrl}${materialRoutes[material.id]}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Материалы", item: `${siteUrl}${siteRoutes.materials}` },
      { "@type": "ListItem", position: 3, name: material.code, item: pageUrl },
    ],
  };

  return (
    <div className={styles.page}>
      <StructuredData data={structuredData} />
      <SiteHeader />
      <main>
        <section className={styles.detailHero}>
          <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <Link href={siteRoutes.materials}>Материалы</Link>
            <span aria-current="page">{material.code}</span>
          </nav>
          <div className={styles.detailHeroGrid}>
            <div>
              <p className={styles.eyebrow}>МАТЕРИАЛ / FDM</p>
              <h1>3D-ПЕЧАТЬ {material.code}</h1>
            </div>
            <div>
              <p className={styles.heroLead}>{material.use}</p>
              <p className={styles.detailHeroText}>{material.description}</p>
              <div className={styles.heroActions}>
                <a className={styles.primary} href="#request">РАССЧИТАТЬ ПЕЧАТЬ</a>
                <Link className={styles.secondary} href={siteRoutes.services}>СМОТРЕТЬ УСЛУГИ</Link>
              </div>
            </div>
          </div>
        </section>

        <dl className={styles.specGrid}>
          <div><dt>МАТЕРИАЛ</dt><dd>{material.code}</dd></div>
          <div><dt>ОСНОВНАЯ ЗАДАЧА</dt><dd>{material.use}</dd></div>
          <div><dt>ТЕХНОЛОГИЯ</dt><dd>Послойная FDM-печать</dd></div>
        </dl>

        <div className={styles.landingContent}>
          <section className={styles.landingSection}>
            <div className={styles.landingHeading}>
              <span>01</span>
              <h2>КОГДА ПОДХОДИТ</h2>
            </div>
            <ul className={styles.infoGrid}>
              {material.bestFor.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className={styles.landingSection}>
            <div className={styles.landingHeading}>
              <span>02</span>
              <h2>СВОЙСТВА</h2>
            </div>
            <ul className={styles.infoGrid}>
              {material.properties.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className={styles.landingSection}>
            <div className={styles.landingHeading}>
              <span>03</span>
              <h2>ЧТО НУЖНО УЧИТЫВАТЬ</h2>
            </div>
            <div className={styles.twoColumnInfo}>
              <p>{material.notFor}</p>
              <ul>{material.considerations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className={styles.landingSection}>
            <div className={styles.landingHeading}>
              <span>04</span>
              <h2>ПОДХОДЯЩИЕ УСЛУГИ</h2>
            </div>
            <div className={styles.relatedGrid}>
              {relatedServices.map((service) => (
                <Link href={serviceRoutes[service.id]} key={service.id}>
                  <strong>{service.number}</strong>
                  <span>{service.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section id="request" className={styles.requestAnchor} aria-label="Форма расчета">
          <ProjectRequestForm />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
