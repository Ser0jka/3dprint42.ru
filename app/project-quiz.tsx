"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { reachMetrikaGoal } from "./metrika-goals";
import { REQUEST_FILE_EXTENSIONS, validateRequestFile } from "./request-file";
import { PERSONAL_DATA_CONSENT_TEXT, PERSONAL_DATA_CONSENT_VERSION } from "./consent";
import styles from "./project-quiz.module.css";

const questions = [
  {
    id: "task",
    title: "Что нужно сделать?",
    options: [
      "Напечатать готовую 3D-модель",
      "Повторить существующую деталь",
      "Разработать новую деталь",
      "Нужна консультация",
    ],
  },
  {
    id: "batch",
    title: "Какой нужен тираж?",
    options: ["1 деталь", "2–10 деталей", "11–50 деталей", "Более 50 деталей"],
  },
  {
    id: "requirement",
    title: "Что для детали важнее всего?",
    options: [
      "Обычные условия",
      "Улица или влага",
      "Нагрев или нагрузка",
      "Гибкость",
      "Точный внешний вид",
    ],
  },
  {
    id: "source",
    title: "Что уже есть?",
    options: ["Готовая 3D-модель", "Эскиз или фотография", "Образец детали", "Пока только идея"],
  },
] as const;

type QuestionId = (typeof questions)[number]["id"];
type Answers = Partial<Record<QuestionId, string>>;
type FormStatus = { message: string; type: "idle" | "success" | "error" };

const initialStatus: FormStatus = {
  message: "Ответим по телефону или в мессенджере и уточним детали.",
  type: "idle",
};

export default function ProjectQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isContactStep = step === questions.length;
  const currentQuestion = questions[step];
  const progress = ((step + 1) / (questions.length + 1)) * 100;
  const summary = useMemo(
    () => questions.map((question) => `${question.title} ${answers[question.id] ?? "—"}`).join("; "),
    [answers],
  );

  const chooseAnswer = (id: QuestionId, answer: string) => {
    if (step === 0 && !answers.task) reachMetrikaGoal("quiz_start");
    setAnswers((current) => ({ ...current, [id]: answer }));
  };

  const goForward = () => {
    if (!currentQuestion || !answers[currentQuestion.id]) return;
    if (step === questions.length - 1) reachMetrikaGoal("quiz_complete");
    setStep((current) => Math.min(current + 1, questions.length));
  };

  const goBack = () => {
    setStatus(initialStatus);
    setStep((current) => Math.max(current - 1, 0));
  };

  const validateFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const error = file ? validateRequestFile(file) : "";
    input.setCustomValidity(error);
    setStatus(error ? { message: error, type: "error" } : initialStatus);
  };

  const submitQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    const fileError = file ? validateRequestFile(file) : "";

    if (fileError) {
      fileInput?.setCustomValidity(fileError);
      fileInput?.reportValidity();
      setStatus({ message: fileError, type: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatus({ message: "Отправляем ответы…", type: "idle" });

    try {
      const response = await fetch("/api/request", { method: "POST", body: new FormData(form) });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Не удалось отправить заявку.");

      reachMetrikaGoal("quiz_submit");
      form.reset();
      setIsSubmitted(true);
      setStatus({ message: "Заявка отправлена. Скоро свяжемся с вами.", type: "success" });
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
    <section className={styles.quizSection} id="quiz" aria-labelledby="quiz-title">
      <div className={styles.quizShell}>
        <div className={styles.quizIntro}>
          <p className={styles.eyebrow}>БЫСТРЫЙ БРИФ / 02</p>
          <h2 id="quiz-title"><span>РАССКАЖИТЕ</span><span>О ЗАДАЧЕ</span></h2>
          <p>Не нужно знать технологию или название пластика. Четырёх ответов достаточно, чтобы начать разговор.</p>
          <ul aria-label="О квизе">
            <li><strong>≈ 1 минута</strong><span>на заполнение</span></li>
            <li><strong>4 вопроса</strong><span>только по делу</span></li>
            <li><strong>Без файла</strong><span>его можно добавить позже</span></li>
          </ul>
        </div>

        <div className={styles.quizPanel}>
          <div className={styles.progressHeader}>
            <span>{isContactStep ? "КОНТАКТЫ" : `ВОПРОС ${String(step + 1).padStart(2, "0")}`}</span>
            <span>{step + 1} / {questions.length + 1}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>

          {isSubmitted ? (
            <div className={styles.success} role="status">
              <i aria-hidden="true" />
              <h3>Заявка отправлена</h3>
              <p>Мы получили ответы и свяжемся с вами, чтобы уточнить задачу.</p>
              <button type="button" onClick={() => {
                setAnswers({});
                setStep(0);
                setIsSubmitted(false);
                setStatus(initialStatus);
              }}>ЗАПОЛНИТЬ ЕЩЁ РАЗ</button>
            </div>
          ) : isContactStep ? (
            <form className={styles.contactForm} onSubmit={submitQuiz}>
              <div className={styles.stepContent} key="contact-step">
                <div className={styles.formHeading}>
                  <h3>Куда отправить ответ?</h3>
                  <p>Оставьте контакт. Файл можно приложить сейчас или прислать позже.</p>
                </div>

                <div className={styles.answerSummary}>
                  {questions.map((question) => (
                    <span key={question.id}>{answers[question.id]}</span>
                  ))}
                </div>

                <input name="requestType" type="hidden" value="quiz" />
                <input name="calculation" type="hidden" value={summary} />
                <div className={styles.contactGrid}>
                  <label>
                    <span>ВАШЕ ИМЯ *</span>
                    <input name="name" autoComplete="name" minLength={2} maxLength={80} required placeholder="Как к вам обращаться" />
                  </label>
                  <label>
                    <span>ТЕЛЕФОН ИЛИ МЕССЕНДЖЕР *</span>
                    <input name="phone" type="tel" inputMode="tel" autoComplete="tel" minLength={6} maxLength={24} pattern="[-+0-9() @._a-zA-Zа-яА-ЯёЁ]{6,24}" required placeholder="+7 900 000-00-00" />
                  </label>
                  <label className={styles.fileField}>
                    <span>ФАЙЛ, ЕСЛИ ЕСТЬ</span>
                    <input name="file" type="file" accept={REQUEST_FILE_EXTENSIONS.join(",")} onChange={validateFileInput} />
                    <small>STL, STEP, STP, OBJ, 3MF, PDF или изображение · до 15 МБ</small>
                  </label>
                </div>

                <label className={styles.honeypot} aria-hidden="true">
                  <span>САЙТ</span><input name="website" tabIndex={-1} autoComplete="off" />
                </label>
                <label className={styles.consent}>
                  <input name="consent" type="checkbox" value={PERSONAL_DATA_CONSENT_VERSION} required />
                  <span>{PERSONAL_DATA_CONSENT_TEXT} <Link href="/privacy">Политика конфиденциальности</Link>.</span>
                </label>

                <div className={styles.formActions}>
                  <button className={styles.backButton} type="button" onClick={goBack}>НАЗАД</button>
                  <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "ОТПРАВЛЯЕМ…" : "ОТПРАВИТЬ ЗАЯВКУ"}<i aria-hidden="true" />
                  </button>
                </div>
                <p className={styles.status} aria-live="polite" data-state={status.type}>{status.message}</p>
              </div>
            </form>
          ) : (
            <div className={styles.stepContent} key={currentQuestion.id}>
              <fieldset className={styles.question}>
                <legend>{currentQuestion.title}</legend>
                <div className={styles.options}>
                  {currentQuestion.options.map((option, index) => (
                    <button
                      type="button"
                      aria-pressed={answers[currentQuestion.id] === option}
                      onClick={() => chooseAnswer(currentQuestion.id, option)}
                      key={option}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{option}</strong>
                      <i aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className={styles.stepActions}>
                <button className={styles.backButton} type="button" onClick={goBack} disabled={step === 0}>НАЗАД</button>
                <button className={styles.primaryButton} type="button" onClick={goForward} disabled={!answers[currentQuestion.id]}>
                  {step === questions.length - 1 ? "К КОНТАКТАМ" : "ДАЛЬШЕ"}<i aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
