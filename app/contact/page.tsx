import type { Metadata } from "next";
import Image from "next/image";
import { siteRoutes } from "../../site-routes";
import ProjectRequestForm from "../project-request-form";
import styles from "../inner.module.css";
import { createMetadata } from "../seo";
import { SiteFooter, SiteHeader } from "../site-shell";
import { getSiteSettings } from "../site-settings-store";

export const metadata: Metadata = createMetadata({
  title: "Заказать 3D-печать в Кемерово: контакты",
  description:
    "Отправьте 3D-модель, эскиз или образец для предварительной оценки. Центр 3D-печати в Кемерово: ул. Сибирская, 36.",
  path: siteRoutes.contact,
  keywords: ["заказать 3д печать кемерово", "3д печать кемерово контакты"],
});

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ calc?: string | string[] }>;
}) {
  const { contact } = await getSiteSettings();
  const requestedCalculation = (await searchParams).calc;
  const initialCalculation = Array.isArray(requestedCalculation)
    ? requestedCalculation[0] ?? ""
    : requestedCalculation ?? "";
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main>
        <section className={styles.contactSection}>
          <div className={styles.contactIntro}>
            <p className={styles.eyebrow}>КОНТАКТЫ / КЕМЕРОВО</p>
            <h1 className={styles.contactHeading}>Заказать 3D-печать</h1>
            <p className={styles.contactLead}>
              Позвоните, напишите в Telegram или отправьте модель через форму. Для первичной оценки достаточно файла, эскиза или фотографии детали.
            </p>
            <a className={styles.primary} href="#request">ОТПРАВИТЬ ЗАДАЧУ</a>
          </div>

          <div className={styles.contactPanel} aria-label="Контактная информация">
            <a className={styles.contactRow} href={contact.phoneHref}>
              <span className={styles.contactLabel}>ТЕЛЕФОН</span>
              <strong>{contact.phoneDisplay}</strong>
              <span className={styles.contactAction}>ПОЗВОНИТЬ</span>
            </a>
            <a className={styles.contactRow} href={contact.map} target="_blank" rel="noreferrer">
              <span className={styles.contactLabel}>АДРЕС</span>
              <strong>{contact.address}</strong>
              <span className={styles.contactAction}>МАРШРУТ</span>
            </a>
            <div className={styles.contactSocialRow}>
              <span className={styles.contactLabel}>СОЦСЕТИ</span>
              <div className={styles.socialLinks}>
                <a
                  className={`${styles.socialIcon} ${styles.socialIconTelegram}`}
                  href={contact.telegram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Написать в Telegram: ${contact.telegramDisplay}`}
                  title="Telegram"
                >
                  <Image src="/icons/telegram.svg" alt="" width={28} height={28} />
                </a>
                <a
                  className={`${styles.socialIcon} ${styles.socialIconVk}`}
                  href={contact.vk}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Открыть страницу ВКонтакте"
                  title="ВКонтакте"
                >
                  <Image src="/icons/vk.svg" alt="" width={28} height={28} />
                </a>
                <a
                  className={`${styles.socialIcon} ${styles.socialIconMax}`}
                  href={contact.max}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Открыть мессенджер MAX"
                  title="MAX"
                >
                  <Image src="/icons/max.svg" alt="" width={28} height={28} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="request">
          <ProjectRequestForm initialCalculation={initialCalculation} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
