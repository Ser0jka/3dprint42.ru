"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { siteRoutes } from "../site-routes";
import { reachMetrikaGoal } from "./metrika-goals";
import { getPriceCalculation, materialPrices } from "./print-pricing";
import type { MaterialId } from "./print-pricing";
import styles from "./calculator.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
const moneyFormat = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function AnimatedValue({ value }: { value: string }) {
  return <span key={value} className={styles.animatedValue}>{value}</span>;
}

function positiveNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export default function PriceCalculator() {
  const [materialId, setMaterialId] = useState<MaterialId>("petg");
  const [weight, setWeight] = useState("50");
  const [quantity, setQuantity] = useState("1");
  const [hasCalculated, setHasCalculated] = useState(false);

  const calculation = useMemo(
    () => getPriceCalculation(materialId, positiveNumber(weight, 0), positiveNumber(quantity, 1)),
    [materialId, quantity, weight],
  );
  const isValid = calculation.unitWeight > 0 && calculation.quantity > 0;
  const customPrice = calculation.totalPrice === null;

  const summary = [
    `Материал: ${calculation.material.name}`,
    `тираж: ${calculation.quantity} шт.`,
    `вес детали: ${numberFormat.format(calculation.unitWeight)} г`,
    `общий вес: ${numberFormat.format(calculation.totalWeight)} г`,
    customPrice
      ? `расчёт: ${calculation.material.customLabel ?? "индивидуально"}`
      : `предварительно: ${moneyFormat.format(calculation.totalPrice ?? 0)} (${numberFormat.format(calculation.rate ?? 0)} ₽/г)`,
  ].join("; ");
  const requestHref = `${siteRoutes.contact}?calc=${encodeURIComponent(summary)}#request`;

  const submitCalculation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasCalculated(true);
    reachMetrikaGoal("calculator_calculate");
  };

  return (
    <div className={styles.calculatorShell}>
      <form className={styles.calculatorForm} onSubmit={submitCalculation}>
        <div className={styles.formHeading}>
          <span>ПАРАМЕТРЫ / 01</span>
          <h2>Введите данные партии</h2>
          <p>Вес укажите для одной готовой детали. Скидка определяется по общему весу всего тиража.</p>
        </div>

        <label className={styles.field}>
          <span>МАТЕРИАЛ</span>
          <select value={materialId} onChange={(event) => setMaterialId(event.target.value as MaterialId)}>
            {materialPrices.map((material) => (
              <option value={material.id} key={material.id}>{material.name}</option>
            ))}
          </select>
          <small><AnimatedValue value={calculation.material.description} /></small>
        </label>

        <div className={styles.fieldPair}>
          <label className={styles.field}>
            <span>ВЕС ОДНОЙ ДЕТАЛИ</span>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                inputMode="decimal"
                min="0.1"
                max="100000"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                onBlur={() => setWeight(String(positiveNumber(weight, 0)))}
                aria-describedby="weight-help"
                required
              />
              <span>Г</span>
            </div>
            <small id="weight-help">Вес модели после подготовки к печати</small>
          </label>

          <label className={styles.field}>
            <span>ТИРАЖ</span>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="10000"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                onBlur={() => setQuantity(String(Math.floor(positiveNumber(quantity, 1))))}
                required
              />
              <span>ШТ.</span>
            </div>
            <small>Количество одинаковых деталей</small>
          </label>
        </div>

        <button className={styles.calculateButton} type="submit" disabled={!isValid}>
          РАССЧИТАТЬ
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
        </button>
      </form>

      <section className={styles.resultPanel} aria-live="polite" aria-label="Результат расчёта">
        <div className={styles.resultHeading}>
          <span>РАСЧЁТ / 02</span>
          <p>
            <AnimatedValue
              value={hasCalculated ? "Предварительная стоимость" : "Результат обновляется автоматически"}
            />
          </p>
        </div>

        <div className={styles.resultPrice}>
          <span><AnimatedValue value={customPrice ? "СТОИМОСТЬ" : "СТОИМОСТЬ ПАРТИИ"} /></span>
          <strong>
            <AnimatedValue
              value={customPrice
                ? calculation.material.customLabel ?? "Индивидуально"
                : moneyFormat.format(calculation.totalPrice ?? 0)}
            />
          </strong>
        </div>

        <dl className={styles.resultFacts}>
          <div><dt>ОБЩИЙ ВЕС</dt><dd><AnimatedValue value={`${numberFormat.format(calculation.totalWeight)} г`} /></dd></div>
          <div><dt>ТАРИФ</dt><dd><AnimatedValue value={calculation.rate === null ? "По запросу" : `${numberFormat.format(calculation.rate)} ₽/г`} /></dd></div>
          <div><dt>ЗА ДЕТАЛЬ</dt><dd><AnimatedValue value={calculation.unitPrice === null ? "По запросу" : moneyFormat.format(calculation.unitPrice)} /></dd></div>
          <div><dt>ДИАПАЗОН</dt><dd><AnimatedValue value={calculation.tier.label} /></dd></div>
        </dl>

        <p className={styles.disclaimer}>
          Это предварительная стоимость печати без моделирования и постобработки. Финальная цена зависит от геометрии, поддержек и времени работы оборудования.
        </p>

        <Link
          className={styles.requestButton}
          href={requestHref}
          onClick={() => reachMetrikaGoal("calculator_request")}
        >
          ПЕРЕДАТЬ РАСЧЁТ И ФАЙЛ
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
        </Link>
      </section>
    </div>
  );
}
