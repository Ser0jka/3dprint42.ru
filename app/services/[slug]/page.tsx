import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { materialRoutes, serviceRoutes, siteRoutes } from "../../../site-routes";
import ProjectRequestForm from "../../project-request-form";
import styles from "../../inner.module.css";
import { createMetadata, siteUrl } from "../../seo";
import { serviceSeo } from "../../seo-pages";
import type { MaterialId } from "../../site-content";
import { figurineGallery, materials, modelingShowcase, services } from "../../site-content";
import { SiteFooter, SiteHeader } from "../../site-shell";
import StructuredData from "../../structured-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((item) => item.id === slug);

  if (!service) {
    return {};
  }

  const seo = serviceSeo[service.id];

  return createMetadata({ ...seo, path: serviceRoutes[service.id] });
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((item) => item.id === slug);

  if (!service) {
    notFound();
  }

  const relatedMaterialIds: readonly MaterialId[] = service.relatedMaterials;
  const relatedMaterials = materials.filter((material) =>
    relatedMaterialIds.includes(material.id),
  );
  const otherServices = services.filter((item) => item.id !== service.id);
  const pageUrl = `${siteUrl}${serviceRoutes[service.id]}`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Услуги", item: `${siteUrl}${siteRoutes.services}` },
        { "@type": "ListItem", position: 3, name: service.title, item: pageUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${service.title} в Кемерово`,
      url: pageUrl,
      description: service.description,
      areaServed: "Кемерово и Кемеровская область — Кузбасс",
      provider: { "@id": `${siteUrl}/#business` },
      serviceType: service.title,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <div className={styles.page}>
      <StructuredData data={structuredData} />
      <SiteHeader />
      <main>
        <section className={styles.detailHero}>
          <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <Link href={siteRoutes.services}>Услуги</Link>
            <span aria-current="page">{service.title}</span>
          </nav>
          <div className={styles.detailHeroGrid}>
            <div>
              <p className={styles.eyebrow}>УСЛУГА / {service.number}</p>
              <h1>{service.title}</h1>
            </div>
            <div>
              <p className={styles.heroLead}>{service.lead}</p>
              <p className={styles.detailHeroText}>{service.description}</p>
              <div className={styles.heroActions}>
                <a className={styles.primary} href="#request">РАССЧИТАТЬ ЗАДАЧУ</a>
                <Link className={styles.secondary} href={siteRoutes.materials}>ВЫБРАТЬ МАТЕРИАЛ</Link>
              </div>
            </div>
          </div>
        </section>

        <dl className={styles.specGrid}>
          <div><dt>НАПРАВЛЕНИЕ</dt><dd>{service.title}</dd></div>
          <div><dt>МАТЕРИАЛЫ</dt><dd>{service.material}</dd></div>
          <div><dt>СТАРТ</dt><dd>Модель, эскиз или образец</dd></div>
        </dl>

        <nav className={styles.detailIndex} aria-label="Содержание страницы">
          <a href="#overview">ОБ УСЛУГЕ</a>
          {service.id === "model-preparation" && <a href="#models">ПРИМЕРЫ МОДЕЛЕЙ</a>}
          {service.id === "figurines" && <a href="#gallery">ГАЛЕРЕЯ</a>}
          <a href="#scope">СОСТАВ РАБОТ</a>
          <a href="#workflow">ПРОЦЕСС</a>
          <a href="#parameters">ПАРАМЕТРЫ</a>
          <a href="#materials">МАТЕРИАЛЫ</a>
          <a href="#faq">ВОПРОСЫ</a>
          <a href="#other-services">ДРУГИЕ УСЛУГИ</a>
        </nav>

        <div className={styles.landingContent}>
          <section className={styles.landingSection} id="overview">
            <div className={styles.landingHeading}>
              <span>01</span>
              <h2>ОБ УСЛУГЕ</h2>
            </div>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCopy}>
                <h3>{service.lead}</h3>
                <p>{service.description}</p>
                <p>
                  До расчёта фиксируем назначение результата и критерии, по которым
                  его можно принять. Это позволяет не переплачивать за лишнее качество
                  и не пропустить важные для работы детали.
                </p>
              </div>
              <div className={styles.useList}>
                <p className={styles.blockLabel}>ПОДХОДИТ ДЛЯ</p>
                <ul>
                  {service.suitableFor.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            {service.id === "model-preparation" && (
              <div className={styles.modelingShowcase} id="models">
                <div className={styles.modelingShowcaseHeader}>
                  <p className={styles.blockLabel}>ИЗ СТАРОГО ПОРТФОЛИО</p>
                  <h3>ПРИМЕРЫ 3D-МОДЕЛЕЙ</h3>
                  <p>Работаем с технической и художественной геометрией. Итоговый формат и детализацию определяем по дальнейшему использованию модели.</p>
                </div>
                <div className={styles.modelingGrid}>
                  {modelingShowcase.map((item) => (
                    <article key={item.title}>
                      <div className={styles.modelingImage}>
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 25vw"
                        />
                      </div>
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {service.id === "figurines" && (
              <div className={styles.figurineShowcase} id="gallery">
                <div className={styles.modelingShowcaseHeader}>
                  <p className={styles.blockLabel}>РЕАЛЬНЫЕ РАБОТЫ</p>
                  <h3>ГАЛЕРЕЯ ФИГУРОК</h3>
                  <p>Два разных масштаба и подхода: готовая окрашенная фигурка и миниатюра со сложной геометрией. Нажмите на фотографию, чтобы перейти в каталог моделей.</p>
                </div>
                <div className={styles.figurineGallery}>
                  {figurineGallery.map((item, index) => (
                    <figure key={item.title}>
                      <Link href={siteRoutes.models} aria-label={`Посмотреть модели в каталоге: ${item.title}`}>
                        <div className={styles.figurineImage}>
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            priority={index === 0}
                          />
                        </div>
                        <span aria-hidden="true">ОТКРЫТЬ</span>
                      </Link>
                      <figcaption>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={styles.landingSection} id="scope">
            <div className={styles.landingHeading}>
              <span>02</span>
              <h2>СОСТАВ РАБОТ</h2>
            </div>
            <div className={styles.featureGrid}>
              {service.deliverables.map((item, index) => (
                <article key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.landingSection} id="workflow">
            <div className={styles.landingHeading}>
              <span>03</span>
              <h2>КАК ПРОХОДИТ РАБОТА</h2>
            </div>
            <ol className={styles.workflowGrid}>
              {service.workflow.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.landingSection} id="parameters">
            <div className={styles.landingHeading}>
              <span>04</span>
              <h2>ПАРАМЕТРЫ ЗАКАЗА</h2>
            </div>
            <dl className={styles.parameterTable}>
              {service.parameters.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.preflightGrid}>
              <div>
                <p className={styles.blockLabel}>ЧТО ПРИСЛАТЬ</p>
                <ul>{service.source.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <p className={styles.blockLabel}>ЧТО УЧИТЫВАЕМ</p>
                <ul>{service.considerations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <p className={styles.blockLabel}>ВАЖНЫЕ ОГРАНИЧЕНИЯ</p>
                <ul>{service.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>

          <section className={styles.landingSection} id="materials">
            <div className={styles.landingHeading}>
              <span>05</span>
              <h2>ПОДХОДЯЩИЕ МАТЕРИАЛЫ</h2>
            </div>
            <div className={styles.materialChoiceGrid}>
              {relatedMaterials.map((material) => (
                <Link href={materialRoutes[material.id]} key={material.id}>
                  <div>
                    <strong>{material.code}</strong>
                    <span>{material.use}</span>
                  </div>
                  <p>{material.description}</p>
                  <ul>
                    {material.properties.map((property) => <li key={property}>{property}</li>)}
                  </ul>
                  <em>ПОДРОБНЕЕ О МАТЕРИАЛЕ</em>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.landingSection} id="faq">
            <div className={styles.landingHeading}>
              <span>06</span>
              <h2>ЧАСТЫЕ ВОПРОСЫ</h2>
            </div>
            <div className={styles.detailFaq}>
              {service.faq.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item.question}
                    <i aria-hidden="true" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
            <div className={styles.serviceBottomAction}>
              <div>
                <p className={styles.blockLabel}>НЕ НАШЛИ СВОЮ СИТУАЦИЮ?</p>
                <h3>Опишите задачу своими словами — для первого ответа достаточно телефона и файла.</h3>
              </div>
              <a className={styles.primaryOnLight} href="#request">ПОЛУЧИТЬ ОЦЕНКУ</a>
            </div>
          </section>

          <section className={styles.landingSection} id="other-services">
            <div className={styles.landingHeading}>
              <span>07</span>
              <h2>ДРУГИЕ УСЛУГИ</h2>
            </div>
            <div className={styles.relatedGrid}>
              {otherServices.map((item) => (
                <Link href={serviceRoutes[item.id]} key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.lead}</span>
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
