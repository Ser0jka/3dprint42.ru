"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./admin.module.css";

type Material = { id: string; name: string; rate: number; costKg: number; density: number; minimum: number };
type WorkRole = "manager" | "production" | "modeling";
type Assignment = { enabled: boolean; person: string };

const materials: Material[] = [
  { id: "pla", name: "PLA", rate: 12, costKg: 800, density: 1.24, minimum: 700 },
  { id: "petg", name: "PETG", rate: 14, costKg: 800, density: 1.27, minimum: 700 },
  { id: "abs", name: "ABS", rate: 15, costKg: 900, density: 1.04, minimum: 700 },
  { id: "asa", name: "ASA", rate: 17, costKg: 1200, density: 1.07, minimum: 700 },
  { id: "tpu", name: "TPU / FLEX", rate: 24, costKg: 1800, density: 1.21, minimum: 700 },
  { id: "petg-cf", name: "PETG-CF", rate: 28, costKg: 2200, density: 1.3, minimum: 700 },
  { id: "pa", name: "PA / Nylon", rate: 35, costKg: 3000, density: 1.14, minimum: 700 },
  { id: "pc", name: "PC", rate: 40, costKg: 3200, density: 1.2, minimum: 700 },
  { id: "pa-gf", name: "PA-GF", rate: 45, costKg: 3800, density: 1.35, minimum: 700 },
  { id: "resin", name: "Фотополимер", rate: 40, costKg: 2500, density: 1.1, minimum: 1000 },
  { id: "pa-cf", name: "PA-CF", rate: 55, costKg: 4800, density: 1.2, minimum: 700 },
  { id: "total-cf5", name: "TOTAL CF-5", rate: 60, costKg: 5200, density: 1.25, minimum: 700 },
];

const modelingOptions = [
  { id: "none", label: "Не нужно", price: 0, note: "Есть готовая модель" },
  { id: "m500", label: "Просто", price: 500, note: "Мелкая правка" },
  { id: "m1000", label: "Обычно", price: 1000, note: "Простая деталь" },
  { id: "m1500", label: "Средне", price: 1500, note: "Несколько размеров" },
  { id: "m2000", label: "Сложно", price: 2000, note: "Много сопряжений" },
  { id: "scan", label: "Сканирование", price: 3500, note: "Автодеталь / сложная форма" },
  { id: "custom", label: "По согласованию", price: 0, note: "Своя стоимость" },
] as const;

const roleMeta: Record<WorkRole, { title: string; note: string; share?: number }> = {
  manager: { title: "Вёл клиента", note: "Расчёт, согласование и выдача", share: 0.12 },
  production: { title: "Готовил и печатал", note: "Слайсер, печать и обработка", share: 0.2 },
  modeling: { title: "Моделировал / сканировал", note: "Получает стоимость этой работы" },
};

const formatter = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const money = (value: number) => formatter.format(Math.round(value));
const positiveNumber = (value: string) => Math.max(0, Number(value) || 0);

export default function AdminOrderCalculator() {
  const [materialId, setMaterialId] = useState("petg");
  const [weightMode, setWeightMode] = useState<"weight" | "dimensions">("weight");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [infill, setInfill] = useState("20");
  const [quantity, setQuantity] = useState("1");
  const [modelingId, setModelingId] = useState("none");
  const [customModeling, setCustomModeling] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [owner, setOwner] = useState("Сергей");
  const [assignments, setAssignments] = useState<Record<WorkRole, Assignment>>({ manager: { enabled: false, person: "" }, production: { enabled: true, person: "Андрей" }, modeling: { enabled: false, person: "" } });
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState("");

  const material = useMemo(() => materials.find((item) => item.id === materialId) || materials[1]!, [materialId]);
  const selectedModeling = modelingOptions.find((item) => item.id === modelingId) || modelingOptions[0];
  const quantityValue = Math.max(1, Math.floor(positiveNumber(quantity)) || 1);
  const shellFactor = Math.min(1, 0.25 + Math.min(100, positiveNumber(infill)) / 100 * 0.75);
  const singleWeight = weightMode === "weight" ? positiveNumber(weight) : positiveNumber(length) * positiveNumber(width) * positiveNumber(height) / 1000 * material.density * shellFactor;
  const totalWeight = singleWeight * quantityValue;
  const modelingBase = modelingId === "custom" ? positiveNumber(customModeling) : selectedModeling.price;
  const multiplier = urgent ? 1.5 : 1;
  const printBase = totalWeight > 0 ? Math.max(totalWeight * material.rate, material.minimum) : 0;
  const printPrice = printBase * multiplier;
  const modelingPrice = modelingBase * multiplier;
  const totalPrice = printPrice + modelingPrice;
  const equipmentFund = printPrice * 0.06;

  const invalidate = () => { setShowResult(false); setError(""); };
  const updateAssignment = (role: WorkRole, patch: Partial<Assignment>) => { setAssignments((current) => ({ ...current, [role]: { ...current[role], ...patch } })); invalidate(); };
  const chooseModeling = (id: string) => {
    const option = modelingOptions.find((item) => item.id === id) || modelingOptions[0];
    setModelingId(option.id);
    setAssignments((current) => ({ ...current, modeling: { ...current.modeling, enabled: option.id !== "none" } }));
    invalidate();
  };

  const people = useMemo(() => {
    const map = new Map<string, { person: string; lines: string[]; amount: number }>();
    const add = (person: string, line: string, amount: number) => { const key = person.trim().toLocaleLowerCase("ru"); if (!key) return; const item = map.get(key) || { person: person.trim(), lines: [], amount: 0 }; item.lines.push(line); item.amount += amount; map.set(key, item); };
    add(owner, "Владелец 15% + аренда 7% + свет 1%", printPrice * 0.23);
    if (assignments.manager.enabled) add(assignments.manager.person, "Ведение клиента · 12%", printPrice * 0.12);
    if (assignments.production.enabled) add(assignments.production.person, "Производство · 20%", printPrice * 0.2);
    if (assignments.modeling.enabled) add(assignments.modeling.person, modelingId === "scan" ? "3D-сканирование" : "3D-моделирование", modelingPrice);
    return [...map.values()];
  }, [assignments, modelingId, modelingPrice, owner, printPrice]);

  const costs = useMemo(() => [
    { label: "Эквайринг · 3%", amount: printPrice * 0.03 }, { label: "Оборудование · 6%", amount: equipmentFund }, { label: "Брак и перепечатки · 10%", amount: printPrice * 0.1 }, { label: "Налоги и административка · 4%", amount: printPrice * 0.04 }, { label: `Пластик ${material.name} · с запасом ×1,5`, amount: totalWeight * material.costKg / 1000 * 1.5 },
  ], [equipmentFund, material, printPrice, totalWeight]);
  const companyReserve = totalPrice - people.reduce((sum, item) => sum + item.amount, 0) - costs.reduce((sum, item) => sum + item.amount, 0);

  const calculate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (singleWeight <= 0) return setError(weightMode === "weight" ? "Укажите вес одной детали." : "Укажите длину, ширину и высоту детали.");
    if (!owner.trim()) return setError("Укажите владельца.");
    const missing = (Object.entries(assignments) as [WorkRole, Assignment][]).find(([, item]) => item.enabled && !item.person.trim());
    if (missing) return setError(`Укажите, кто выполнял работу «${roleMeta[missing[0]].title}».`);
    if (modelingId === "custom" && modelingBase <= 0) return setError("Укажите согласованную стоимость моделирования.");
    setShowResult(true);
  };

  return <section className={styles.calculatorSection}>
    <div className={styles.sectionHeading}><span>РАСЧЁТ ЗАКАЗА</span><h1>Сколько стоит заказ</h1><p>Пластик, вес, подготовка модели и срок. Затем назначьте исполнителей и получите полную разбивку.</p></div>
    <form className={styles.simpleCalculator} onSubmit={calculate} onChange={invalidate}>
      <section className={styles.calcStep}><header><b>01</b><div><h2>Выберите пластик</h2><p>Цена указана за грамм готовой детали.</p></div></header><div className={styles.choiceGrid} data-columns="materials">{materials.map((item) => <button type="button" data-active={materialId === item.id} onClick={() => { setMaterialId(item.id); invalidate(); }} key={item.id}><strong>{item.name}</strong><span>{item.rate} ₽/г</span></button>)}</div><div className={styles.liveFormula}><span>ФОРМУЛА ПЕЧАТИ</span><strong>{material.rate} ₽/г</strong><p>{totalWeight > 0 ? `${totalWeight.toFixed(1)} г × ${material.rate} ₽${printBase === material.minimum ? `, но минимум ${money(material.minimum)}` : ""}` : `Вес детали × ${material.rate} ₽ за грамм`}</p></div></section>

      <section className={styles.calcStep}><header><b>02</b><div><h2>Укажите вес</h2><p>Если веса нет, получите приблизительную оценку по габаритам.</p></div></header><div className={styles.segmented}><button type="button" data-active={weightMode === "weight"} onClick={() => { setWeightMode("weight"); invalidate(); }}>ЗНАЮ ВЕС</button><button type="button" data-active={weightMode === "dimensions"} onClick={() => { setWeightMode("dimensions"); invalidate(); }}>ТОЛЬКО РАЗМЕРЫ</button></div>{weightMode === "weight" ? <div className={styles.bigInput}><label><span>ВЕС ОДНОЙ ДЕТАЛИ</span><input type="number" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} min="0.1" step="0.1" placeholder="0" required /><b>г</b></label></div> : <div className={styles.dimensionFields}><label><span>ДЛИНА, ММ</span><input type="number" value={length} onChange={(event) => setLength(event.target.value)} min="1" required /></label><label><span>ШИРИНА, ММ</span><input type="number" value={width} onChange={(event) => setWidth(event.target.value)} min="1" required /></label><label><span>ВЫСОТА, ММ</span><input type="number" value={height} onChange={(event) => setHeight(event.target.value)} min="1" required /></label><label><span>ЗАПОЛНЕНИЕ, %</span><input type="number" value={infill} onChange={(event) => setInfill(event.target.value)} min="0" max="100" required /></label><p>Ориентировочный вес: <strong>{singleWeight > 0 ? `${singleWeight.toFixed(1)} г` : "—"}</strong>. Финальный вес подтвердите в слайсере.</p></div>}<label className={styles.quantityInput}><span>КОЛИЧЕСТВО</span><input type="number" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} min="1" step="1" required /><b>шт.</b></label></section>

      <section className={styles.calcStep}><header><b>03</b><div><h2>Подготовка модели</h2><p>Выберите ближайшую сложность. Нестандартные работы оцениваются отдельно.</p></div></header><div className={styles.choiceGrid} data-columns="modeling">{modelingOptions.map((item) => <button type="button" data-active={modelingId === item.id} onClick={() => chooseModeling(item.id)} key={item.id}><strong>{item.label}</strong><span>{item.id === "scan" ? "от " : ""}{item.price ? money(item.price) : item.id === "custom" ? "своя цена" : "0 ₽"}</span><small>{item.note}</small></button>)}</div>{modelingId === "custom" && <label className={styles.customPrice}><span>СОГЛАСОВАННАЯ СТОИМОСТЬ</span><input type="number" value={customModeling} onChange={(event) => setCustomModeling(event.target.value)} min="1" required /><b>₽</b></label>}</section>

      <section className={styles.calcStep}><header><b>04</b><div><h2>Срок изготовления</h2><p>Обычный срок полного изготовления — 4–5 дней.</p></div></header><div className={styles.deadlineChoices}><button type="button" data-active={!urgent} onClick={() => { setUrgent(false); invalidate(); }}><strong>Обычно</strong><span>4–5 дней · ×1</span></button><button type="button" data-active={urgent} onClick={() => { setUrgent(true); invalidate(); }}><strong>Срочно</strong><span>Цена ×1,5 · срок по согласованию</span></button></div><div className={styles.totalPreview}><span>ПРЕДВАРИТЕЛЬНО КЛИЕНТУ</span><strong>{totalWeight > 0 ? money(totalPrice) : "—"}</strong><p>{totalWeight > 0 ? `${money(printPrice)} печать + ${money(modelingPrice)} подготовка${urgent ? " · срочность ×1,5" : ""}` : "Сначала укажите вес или размеры"}</p></div></section>

      <section className={styles.calcStep}><header><b>05</b><div><h2>Кто что делал</h2><p>Один человек может выполнить несколько работ — выплаты объединятся.</p></div></header><div className={styles.assignmentList}><div className={styles.assignmentRow} data-enabled="true"><div><strong>Владелец</strong><p>15% + аренда 7% + свет 1% · всего 23%</p></div><label><span>ЧЕЛОВЕК</span><input list="team-members" value={owner} onChange={(event) => setOwner(event.target.value)} required /></label></div>{(Object.entries(roleMeta) as [WorkRole, typeof roleMeta[WorkRole]][]).map(([role, meta]) => <div className={styles.assignmentRow} data-enabled={assignments[role].enabled} key={role}><label className={styles.assignmentToggle}><input type="checkbox" checked={assignments[role].enabled} onChange={(event) => updateAssignment(role, { enabled: event.target.checked })} disabled={role === "modeling" && modelingId === "none"} /><span aria-hidden="true" /><div><strong>{meta.title}</strong><p>{meta.note}{meta.share ? ` · ${meta.share * 100}%` : ""}</p></div></label><label><span>ЧЕЛОВЕК</span><input list="team-members" value={assignments[role].person} onChange={(event) => updateAssignment(role, { person: event.target.value })} disabled={!assignments[role].enabled} required={assignments[role].enabled} placeholder="Выберите или введите имя" /></label></div>)}<datalist id="team-members"><option value="Сергей" /><option value="Андрей" /></datalist></div></section>
      <div className={styles.financeSubmit}><button className={styles.saveButton} type="submit">ПОКАЗАТЬ ПОЛНУЮ РАЗБИВКУ</button><p role="alert" aria-live="polite">{error}</p></div>
    </form>

    {showResult && <section className={styles.financeResult} aria-live="polite"><header><div><span>ИТОГОВАЯ ЦЕНА</span><h2>{money(totalPrice)}</h2><p>{quantityValue} шт. · около {totalWeight.toFixed(1)} г{urgent ? " · срочный заказ" : " · 4–5 дней"}</p></div><dl><div><dt>ПЕЧАТЬ</dt><dd>{money(printPrice)}</dd></div><div><dt>МОДЕЛИРОВАНИЕ</dt><dd>{money(modelingPrice)}</dd></div><div><dt>ОБОРУДОВАНИЕ · 6%</dt><dd>{money(equipmentFund)}</dd></div><div data-negative={companyReserve < 0}><dt>{companyReserve < 0 ? "УБЫТОК" : "РЕЗЕРВ КОМПАНИИ"}</dt><dd>{money(Math.abs(companyReserve))}</dd></div></dl></header><div className={styles.payoutGrid}><section><span>КТО СКОЛЬКО ПОЛУЧИТ</span>{people.map((item) => <article key={item.person}><div><h3>{item.person}</h3>{item.lines.map((line) => <p key={line}>{line}</p>)}</div><strong>{money(item.amount)}</strong></article>)}</section><section><span>ФОНДЫ И РАСХОДЫ</span>{costs.map((item) => <article key={item.label}><h3>{item.label}</h3><strong>{money(item.amount)}</strong></article>)}</section></div><p className={styles.financeNote}>Расчёт по размерам приблизительный. Точную массу, срок и цену нестандартной или автомобильной детали подтвердите после проверки геометрии и подготовки в слайсере.</p></section>}
  </section>;
}
