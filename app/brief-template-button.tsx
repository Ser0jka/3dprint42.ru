"use client";

import { useState } from "react";
import styles from "./page.module.css";

const briefTemplate = `Задача детали:
Основные размеры:
Количество:
Условия эксплуатации и нагрузки:
Предпочтительный материал, если известен:
Желаемый срок:
Ссылка на файл или модель:`;

export default function BriefTemplateButton() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(briefTemplate);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  const label = {
    idle: "СКОПИРОВАТЬ ШАБЛОН ЗАПРОСА",
    copied: "ШАБЛОН СКОПИРОВАН",
    error: "НЕ УДАЛОСЬ СКОПИРОВАТЬ",
  }[status];

  return (
    <button className={styles.darkAction} type="button" onClick={copyTemplate}>
      <span aria-live="polite">{label}</span>
      <span className={styles.copyIcon} aria-hidden="true" />
    </button>
  );
}
