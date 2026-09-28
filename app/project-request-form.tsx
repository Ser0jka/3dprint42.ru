"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { reachMetrikaGoal } from "./metrika-goals";
import { REQUEST_FILE_EXTENSIONS, validateRequestFile } from "./request-file";
import { PERSONAL_DATA_CONSENT_TEXT, PERSONAL_DATA_CONSENT_VERSION } from "./consent";
import styles from "./project-request-form.module.css";

type FormStatus = {
  message: string;
  type: "idle" | "success" | "error";
};

const initialStatus: FormStatus = {
  message: "Файл сохранится в защищённом разделе заявок.",
  type: "idle",
};

export default function ProjectRequestForm({ initialCalculation = "" }: { initialCalculation?: string }) {
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculation, setCalculation] = useState(initialCalculation.slice(0, 400));

  const validateFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const error = file ? validateRequestFile(file) : "";

    input.setCustomValidity(error);
    setStatus(error ? { message: error, type: "error" } : initialStatus);
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      fileInput?.setCustomValidity("Выберите файл для оценки.");
      fileInput?.reportValidity();
      return;
    }

    const fileError = validateRequestFile(file);
    if (fileError) {
      fileInput.setCustomValidity(fileError);
      fileInput.reportValidity();
      setStatus({ message: fileError, type: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ message: "Отправляем файл…", type: "idle" });

    try {
      const response = await fetch("/api/request", {
        method: "POST",
        body: new FormData(form),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Не удалось отправить заявку. Попробуйте ещё раз.");
      }

      reachMetrikaGoal("form_submit");
      form.reset();
      setStatus({
        message: "Готово. Заявка сохранена, мы свяжемся с вами в ближайшее время.",
        type: "success",
      });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Не удалось отправить заявку. Попробуйте ещё раз.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formShell}>
      <div className={styles.formIntro}>
        <span>ЗАПРОС / 01</span>
        <h2>ОТПРАВЬТЕ ФАЙЛ</h2>
        <p>Имени, телефона и модели достаточно для первичной оценки проекта.</p>
        <ul>
          <li>3D: STL, STEP, STP, OBJ, 3MF</li>
          <li>Эскизы: PDF, PNG, JPG, WEBP</li>
          <li>До 15 МБ · архивы и программы запрещены</li>
        </ul>
      </div>

      <form className={styles.form} onSubmit={submitRequest}>
        {calculation ? (
          <div className={styles.calculationSummary}>
            <span>РАСЧЁТ ИЗ КАЛЬКУЛЯТОРА</span>
            <p>{calculation}</p>
            <button type="button" onClick={() => setCalculation("")}>УБРАТЬ</button>
          </div>
        ) : null}
        <input name="calculation" type="hidden" value={calculation} />
        <div className={styles.fieldGrid}>
          <label>
            <span>ВАШЕ ИМЯ *</span>
            <input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              placeholder="Как к вам обращаться"
            />
          </label>
          <label>
            <span>ТЕЛЕФОН *</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              minLength={6}
              maxLength={24}
              pattern="[-+0-9() ]{6,24}"
              required
              placeholder="+7 900 000-00-00"
            />
          </label>
          <label className={styles.fileField}>
            <span>ФАЙЛ *</span>
            <input
              name="file"
              type="file"
              accept={REQUEST_FILE_EXTENSIONS.join(",")}
              onChange={validateFileInput}
              required
            />
            <small>Модель или эскиз, до 15 МБ</small>
          </label>
        </div>

        <label className={styles.honeypot} aria-hidden="true">
          <span>САЙТ</span>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <label className={styles.consent}>
          <input name="consent" type="checkbox" value={PERSONAL_DATA_CONSENT_VERSION} required />
          <span>
            {PERSONAL_DATA_CONSENT_TEXT} <Link href="/privacy">Политика конфиденциальности</Link>.
          </span>
        </label>

        <div className={styles.submitRow}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ ЗАЯВКУ"}
            <i aria-hidden="true" />
          </button>
          <p aria-live="polite" data-state={status.type}>{status.message}</p>
        </div>
      </form>
    </div>
  );
}
