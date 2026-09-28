import Image from "next/image";
import Link from "next/link";
import { materialRoutes, serviceRoutes, siteRoutes } from "../site-routes";
import HeroVideo from "./hero-video";
import ProjectRequestForm from "./project-request-form";
import ProjectQuiz from "./project-quiz";
import { homeServices, materials } from "./site-content";
import { siteUrl } from "./seo";
import { SiteFooter, SiteHeader } from "./site-shell";
import { getSiteSettings } from "./site-settings-store";
import StructuredData from "./structured-data";
import styles from "./page.module.css";

const faq = [
  ["Можно без готовой 3D-модели?", "Да. Пришлите фото, эскиз, размеры или саму деталь. Подскажем, что ещё понадобится для оценки."],
  ["Как узнать стоимость?", "Отправьте файл или описание задачи. Мы проверим геометрию, уточним количество и предложим материал — после этого назовём стоимость."],
  ["Какой пластик выбрать?", "Самостоятельно разбираться не нужно. Расскажите, где и как будет работать деталь, а материал подберём мы."],
  ["Можно повторить сломанную деталь?", "Часто да. Нужен образец, фотографии или основные размеры. Сначала оценим возможность изготовления."],
] as const;

export default async function Home() {
  const { hero } = await getSiteSettings();
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
    url: siteUrl,
  };

  return (
    <div className={styles.page}>
      <StructuredData data={faqStructuredData} />
      <a className={styles.skipLink} href="#main-content">Перейти к содержанию</a>
      <SiteHeader overlay />
      <main id="main-content">
        <section className={styles.hero} id="start" aria-labelledby="hero-title">
          <HeroVideo />
          <div className={styles.heroScrim} aria-hidden="true" />
          <div className={styles.heroMeta}><p>РАБОТАЕМ С ФАЙЛОМ И ЭСКИЗОМ</p><p>ОТ 1 ДЕТАЛИ</p></div>
          <div className={styles.heroCopy}>
            <div className={styles.statusLine}><span className={styles.statusDot} aria-hidden="true" /><span>{hero.eyebrow}</span><span className={styles.statusPill}>FDM PRODUCTION</span></div>
            <h1 id="hero-title"><span>{hero.titleLineOne}</span><span>{hero.titleLineTwo}</span></h1>
            <div className={styles.heroLead}>
              <p>{hero.description}</p>
              <div className={styles.heroActions}><Link className={styles.primaryAction} href={siteRoutes.quiz}>РАССЧИТАТЬ СТОИМОСТЬ<span className={styles.arrowDown} aria-hidden="true" /></Link><Link className={styles.textAction} href={siteRoutes.services}>СМОТРЕТЬ УСЛУГИ</Link></div>
            </div>
          </div>
        </section>

        <section className={styles.benefitStrip} aria-label="Преимущества производства">
          <article><strong>5 лет</strong><h2>НА РЫНКЕ</h2><p>Работаем с задачами для бизнеса и частных клиентов.</p></article>
          <article><strong>от 7 ₽/г</strong><h2>ПЕЧАТЬ</h2><p>Рассчитаем точную стоимость по модели, материалу и параметрам детали.</p></article>
          <article><strong>24 часа</strong><h2>НА СВЯЗИ</h2><p>Принимаем заявки и отвечаем на вопросы каждый день.</p></article>
          <article><strong>Любой</strong><h2>ТИРАЖ</h2><p>От одной детали до повторяемой небольшой партии.</p></article>
        </section>

        <section className={styles.servicesSection} id="capabilities" aria-labelledby="services-title">
          <div className={styles.simpleHeader}><div><p className={styles.sectionIndex}>01 / УСЛУГИ</p><h2 id="services-title">ЧТО МЫ ДЕЛАЕМ</h2></div><p>Берём задачу от идеи до готовой детали. Нажмите на нужный вариант, чтобы увидеть примеры и условия.</p></div>
          <div className={styles.serviceGrid}>
            {homeServices.map((service) => (
              <Link className={styles.serviceCard} href={serviceRoutes[service.id]} key={service.id}><span>{service.number}</span><div><h3>{service.title}</h3><p>{service.lead}</p></div><i aria-hidden="true" /></Link>
            ))}
          </div>
          <div className={styles.serviceAllRow}>
            <Link className={styles.serviceAllLink} href={siteRoutes.services}>
              СМОТРЕТЬ ВСЕ УСЛУГИ
              <i aria-hidden="true" />
            </Link>
          </div>
        </section>

        <ProjectQuiz />

        <section className={styles.materialGuide} aria-labelledby="materials-title">
          <div className={styles.materialVisual}><Image src="/media/materials-filament.jpg" alt="Катушки материалов для 3D-печати разных типов" fill sizes="(max-width: 980px) 100vw, 48vw" /></div>
          <div className={styles.materialCopy}>
            <p className={styles.sectionIndex}>02 / МАТЕРИАЛЫ</p><h2 id="materials-title">МАТЕРИАЛ ПОДБЕРЁМ САМИ</h2>
            <p>Расскажите, где будет работать деталь: в помещении или на улице, под нагрузкой, при нагреве или во влаге. Этого достаточно для старта.</p>
            <ul>{materials.map((material) => <li key={material.id}><Link href={materialRoutes[material.id]}><b>{material.code}</b><span>{material.use}</span></Link></li>)}</ul>
            <Link className={styles.darkLink} href={siteRoutes.materials}>СРАВНИТЬ МАТЕРИАЛЫ</Link>
          </div>
        </section>

        <section className={styles.requestSection} id="request" aria-label="Форма заявки"><ProjectRequestForm /></section>
        <section className={styles.faq} id="faq" aria-labelledby="faq-title">
          <div className={styles.faqGrid}><div className={styles.faqHeader}><p className={styles.sectionIndex}>03 / КОРОТКО О ГЛАВНОМ</p><h2 id="faq-title">ЧАСТЫЕ ВОПРОСЫ</h2></div><div className={styles.faqList}>{faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<i aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
