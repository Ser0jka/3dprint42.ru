"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { materialRoutes, serviceRoutes, siteRoutes } from "../site-routes";
import { materials, services } from "./site-content";
import styles from "./site-shell.module.css";

const menuGroups = [
  {
    id: "services",
    label: "УСЛУГИ",
    href: siteRoutes.services,
    eyebrow: "3D-ПЕЧАТЬ НА ЗАКАЗ",
    title: "Что можно заказать",
    description: "От одной детали до небольшой повторяемой серии.",
    items: [
      ...services.map((service) => ({
        number: service.number,
        title: service.title,
        description: service.lead,
        href: serviceRoutes[service.id],
      })),
      {
        number: "08",
        title: "Рассчитать задачу",
        description: "Ответьте на четыре вопроса — уточним детали и стоимость.",
        href: siteRoutes.quiz,
      },
    ],
  },
  {
    id: "works",
    label: "НАШИ РАБОТЫ",
    href: siteRoutes.cases,
    eyebrow: "ПРИМЕРЫ И МОДЕЛИ",
    title: "Что мы печатаем",
    description: "Готовые модели, примеры задач, прототипы и небольшие серии.",
    items: [
      {
        number: "01",
        title: "Каталог деталей",
        description: "Готовые детали с интерактивным просмотром.",
        href: siteRoutes.models,
      },
      {
        number: "02",
        title: "Примеры 3D-печати",
        description: "Задачи, с которыми к нам обращаются чаще всего.",
        href: siteRoutes.cases,
      },
      {
        number: "03",
        title: "Прототипирование",
        description: "Проверка формы, сборки и механики до производства.",
        href: serviceRoutes.prototypes,
      },
      {
        number: "04",
        title: "Малые серии",
        description: "Повторяемые партии без пресс-форм и дорогой оснастки.",
        href: serviceRoutes["small-series"],
      },
    ],
  },
  {
    id: "materials",
    label: "МАТЕРИАЛЫ",
    href: siteRoutes.materials,
    eyebrow: "ПЛАСТИКИ ДЛЯ ПЕЧАТИ",
    title: "Подберём под задачу",
    description: "Выбор зависит от нагрузки, температуры, гибкости и условий работы.",
    items: materials.map((material, index) => ({
      number: String(index + 1).padStart(2, "0"),
      title: material.code,
      description: material.use,
      href: materialRoutes[material.id],
    })),
  },
] as const;

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 10" aria-hidden="true">
      <path d="m2 2 6 6 6-6" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? <path d="M5 5l14 14M19 5 5 19" /> : <path d="M3 7h18M3 17h18" />}
    </svg>
  );
}

export default function PortalNavigation() {
  const navRef = useRef<HTMLElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenGroup(null);
      setMobileOpen(false);
      navRef.current?.querySelector<HTMLButtonElement>("[aria-expanded='true']")?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const clearHoverTimer = () => {
    if (!hoverTimerRef.current) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
  };
  const scheduleOpen = (groupId: string) => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => setOpenGroup(groupId), 120);
  };
  const scheduleClose = () => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => setOpenGroup(null), 90);
  };
  const closeMenu = () => {
    setOpenGroup(null);
    setMobileOpen(false);
  };

  return (
    <nav className={styles.portalNav} aria-label="Основная навигация" ref={navRef}>
      <button
        className={styles.menuToggle}
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="main-menu"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>{mobileOpen ? "ЗАКРЫТЬ" : "МЕНЮ"}</span>
        <MenuIcon open={mobileOpen} />
      </button>

      <ul className={styles.navList} id="main-menu" data-mobile-open={mobileOpen}>
        {menuGroups.map((group) => {
          const isOpen = openGroup === group.id;
          return (
            <li
              className={styles.navGroup}
              data-open={isOpen}
              key={group.id}
              onMouseEnter={() => scheduleOpen(group.id)}
              onMouseLeave={scheduleClose}
            >
              <div className={styles.navGroupTop}>
                <Link href={group.href} onClick={closeMenu}>{group.label}</Link>
                <button
                  type="button"
                  aria-label={`${isOpen ? "Закрыть" : "Открыть"} раздел ${group.label.toLowerCase()}`}
                  aria-expanded={isOpen}
                  aria-controls={`menu-${group.id}`}
                  onClick={() => {
                    clearHoverTimer();
                    setOpenGroup(isOpen ? null : group.id);
                  }}
                >
                  <ChevronIcon />
                </button>
              </div>

              <div
                className={styles.megaPanel}
                id={`menu-${group.id}`}
                data-visible={isOpen}
                aria-hidden={!isOpen}
              >
                <div className={styles.megaIntro}>
                  <span>{group.eyebrow}</span>
                  <p className={styles.megaTitle}>{group.title}</p>
                  <p>{group.description}</p>
                  <Link href={group.href} onClick={closeMenu}>СМОТРЕТЬ РАЗДЕЛ</Link>
                </div>

                <ul className={styles.megaLinks}>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} onClick={closeMenu}>
                        <span>{item.number}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M4 10h11M11 5l5 5-5 5" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className={styles.megaContact}>
                  <span>ЕСТЬ ФАЙЛ ИЛИ ЭСКИЗ?</span>
                  <p>Пришлите его вместе с телефоном — этого достаточно для оценки.</p>
                  <Link href={`${siteRoutes.contact}#request`} onClick={closeMenu}>ОТПРАВИТЬ ЗАДАЧУ</Link>
                </div>
              </div>
            </li>
          );
        })}

        <li className={styles.directNavLink}>
          <Link href={siteRoutes.models} onClick={closeMenu}>КАТАЛОГ ДЕТАЛЕЙ</Link>
        </li>
        <li className={styles.directNavLink}>
          <Link href={siteRoutes.process} onClick={closeMenu}>О НАС</Link>
        </li>
        <li className={styles.directNavLink}>
          <Link href={siteRoutes.contact} onClick={closeMenu}>КОНТАКТЫ</Link>
        </li>
      </ul>
    </nav>
  );
}
