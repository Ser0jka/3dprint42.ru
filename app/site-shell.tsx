import Image from "next/image";
import Link from "next/link";
import { siteRoutes } from "../site-routes";
import { navigation } from "./site-content";
import { getSiteSettings } from "./site-settings-store";
import PortalNavigation from "./portal-navigation";
import styles from "./site-shell.module.css";

export async function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const { contact } = await getSiteSettings();
  return (
    <header className={`${styles.header} ${overlay ? styles.overlay : styles.solid}`}>
      <Link className={styles.brand} href="/" aria-label="Центр 3D-печати — главная">
        <span>ЦЕНТР 3D-ПЕЧАТИ</span>
        <small>АДДИТИВНОЕ ПРОИЗВОДСТВО</small>
      </Link>

      <PortalNavigation />

      <Link className={styles.navAction} href={`${siteRoutes.contact}#request`}>
        ОБСУДИТЬ ПРОЕКТ
      </Link>

      <a
        className={styles.supportLink}
        data-support-link
        href={contact.telegram}
        target="_blank"
        rel="noreferrer"
        aria-label="Задать быстрый вопрос в Telegram"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 18.5 4 22l3.6-2.2A9 9 0 1 0 3 12c0 2.5 1 4.8 2 6.5Z" />
        </svg>
        <span>ЗАДАТЬ ВОПРОС</span>
      </a>
    </header>
  );
}

export async function SiteFooter() {
  const { contact } = await getSiteSettings();
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Link href="/">ЦЕНТР 3D-ПЕЧАТИ</Link>
        <p>ЦИФРОВОЕ ПРОИЗВОДСТВО / КУЗБАСС</p>
      </div>

      <div className={styles.footerColumns}>
        <nav aria-label="Разделы сайта">
          <span>РАЗДЕЛЫ</span>
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={siteRoutes.contact}>КОНТАКТЫ</Link>
        </nav>
        <div>
          <span>СВЯЗЬ</span>
          <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
          <div className={styles.footerSocialLinks}>
            <a
              className={`${styles.footerSocialLink} ${styles.footerSocialTelegram}`}
              href={contact.telegram}
              target="_blank"
              rel="noreferrer"
              aria-label={`Написать в Telegram: ${contact.telegramDisplay}`}
              title="Telegram"
            >
              <Image src="/icons/telegram.svg" alt="" width={24} height={24} />
            </a>
            <a
              className={`${styles.footerSocialLink} ${styles.footerSocialVk}`}
              href={contact.vk}
              target="_blank"
              rel="noreferrer"
              aria-label="Открыть страницу ВКонтакте"
              title="ВКонтакте"
            >
              <Image src="/icons/vk.svg" alt="" width={24} height={24} />
            </a>
            <a
              className={`${styles.footerSocialLink} ${styles.footerSocialMax}`}
              href={contact.max}
              target="_blank"
              rel="noreferrer"
              aria-label="Написать в мессенджере MAX"
              title="MAX"
            >
              <Image src="/icons/max.svg" alt="" width={24} height={24} />
            </a>
          </div>
          <a href={contact.map} target="_blank" rel="noreferrer">2ГИС / МАРШРУТ</a>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span className={styles.footerLegalCompany}>
          © 2026 ЦЕНТР 3D-ПЕЧАТИ · ИП СУРОВЦЕВ СЕРГЕЙ СЕРГЕЕВИЧ · ИНН 420543355313 · ОГРНИП 326420500101781
        </span>
        <nav className={styles.footerLegalLinks} aria-label="Юридические документы">
          <a
            href="/documents/privacy-policy-3dprint42.pdf"
            target="_blank"
            rel="noreferrer"
            type="application/pdf"
          >
            КОНФИДЕНЦИАЛЬНОСТЬ
          </a>
          <a
            href="/documents/cookie-policy-3dprint42.pdf"
            target="_blank"
            rel="noreferrer"
            type="application/pdf"
          >
            COOKIE
          </a>
          <a
            href="/documents/user-agreement-3dprint42.pdf"
            target="_blank"
            rel="noreferrer"
            type="application/pdf"
          >
            СОГЛАШЕНИЕ
          </a>
        </nav>
        <Link href="/#start">НАВЕРХ</Link>
      </div>
    </footer>
  );
}
