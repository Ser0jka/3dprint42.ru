"use client";

import { useEffect, useState } from "react";
import { METRIKA_CONSENT_COOKIE } from "./metrika-goals";
import styles from "./cookie-consent.module.css";

type ConsentChoice = "acknowledged" | "analytics" | "necessary";

function readConsent(): ConsentChoice | null {
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${METRIKA_CONSENT_COOKIE}=`))
    ?.split("=")[1];

  return value === "acknowledged" ||
    value === "analytics" ||
    value === "necessary"
    ? value
    : null;
}

function saveConsent(choice: ConsentChoice) {
  document.cookie = `${METRIKA_CONSENT_COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/dashboard") || window.location.pathname.startsWith("/admin")) return;
    const consent = readConsent();

    if (consent) return;

    const revealTimer = window.setTimeout(() => setIsVisible(true), 0);
    return () => window.clearTimeout(revealTimer);
  }, []);

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <section
      className={styles.banner}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className={styles.iconWrap} aria-hidden="true">
        <span className={styles.icon} />
      </div>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>ФАЙЛЫ COOKIE</p>
        <strong id="cookie-consent-title">Мы используем файлы cookie</strong>
        <p id="cookie-consent-description">
          На сайте работает Яндекс Метрика: она помогает анализировать
          посещаемость и улучшать сайт.
        </p>
        <a
          href="/documents/cookie-policy-3dprint42.pdf"
          target="_blank"
          rel="noreferrer"
          type="application/pdf"
        >
          Политика cookie
        </a>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.accept}
          type="button"
          onClick={() => choose("acknowledged")}
        >
          ПОНЯТНО
        </button>
      </div>
    </section>
  );
}
