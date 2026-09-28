export type MaterialId =
  | "pla"
  | "petg"
  | "abs"
  | "asa"
  | "tpu"
  | "resin"
  | "nylon"
  | "engineering";

export type PriceTier = {
  label: string;
  shortLabel: string;
  maxWeight: number;
};

export type MaterialPrice = {
  id: MaterialId;
  name: string;
  description: string;
  rates: readonly (number | null)[];
  customLabel?: string;
};

export const priceTiers: readonly PriceTier[] = [
  { label: "До 100 г", shortLabel: "≤ 100 г", maxWeight: 100 },
  { label: "100–500 г", shortLabel: "≤ 500 г", maxWeight: 500 },
  { label: "0,5–1 кг", shortLabel: "≤ 1 кг", maxWeight: 1_000 },
  { label: "1–3 кг", shortLabel: "≤ 3 кг", maxWeight: 3_000 },
  { label: "3–5 кг", shortLabel: "≤ 5 кг", maxWeight: 5_000 },
  { label: "Более 5 кг", shortLabel: "> 5 кг", maxWeight: Number.POSITIVE_INFINITY },
] as const;

export const materialPrices: readonly MaterialPrice[] = [
  {
    id: "pla",
    name: "PLA",
    description: "Макеты, прототипы и детали без нагрева",
    rates: [10, 9, 8, 7, 6.5, null],
    customLabel: "Договорная",
  },
  {
    id: "petg",
    name: "PETG",
    description: "Универсальные функциональные детали",
    rates: [11, 10, 9, 8, 7, 6],
  },
  {
    id: "abs",
    name: "ABS",
    description: "Корпуса, механика и нагруженные детали",
    rates: [12, 11, 10, 9, 8, 7],
  },
  {
    id: "asa",
    name: "ASA",
    description: "Уличные детали, стойкие к погоде и УФ",
    rates: [14, 13, 12, 11, 10, 9],
  },
  {
    id: "tpu",
    name: "TPU",
    description: "Гибкие элементы, накладки и уплотнения",
    rates: [22, 20, 17, 16, 15, 14],
  },
  {
    id: "resin",
    name: "Фотополимер",
    description: "Высокая детализация и гладкая поверхность",
    rates: [20, 20, 20, 20, 20, 20],
  },
  {
    id: "nylon",
    name: "PA / Nylon",
    description: "Износостойкие технические детали",
    rates: [30, 27, 24, 22, 20, null],
    customLabel: "Индивидуально",
  },
  {
    id: "engineering",
    name: "PC / инженерные пластики",
    description: "Ответственные детали под особые условия",
    rates: [35, 30, 27, 25, 22, null],
    customLabel: "Индивидуально",
  },
] as const;

export function getPriceCalculation(materialId: MaterialId, unitWeight: number, quantity: number) {
  const material = materialPrices.find((item) => item.id === materialId) ?? materialPrices[1];
  const safeUnitWeight = Number.isFinite(unitWeight) ? Math.max(0, unitWeight) : 0;
  const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  const totalWeight = safeUnitWeight * safeQuantity;
  const tierIndex = priceTiers.findIndex((tier) => totalWeight <= tier.maxWeight);
  const resolvedTierIndex = tierIndex >= 0 ? tierIndex : priceTiers.length - 1;
  const rate = material.rates[resolvedTierIndex] ?? null;
  const totalPrice = rate === null ? null : totalWeight * rate;

  return {
    material,
    quantity: safeQuantity,
    unitWeight: safeUnitWeight,
    totalWeight,
    tier: priceTiers[resolvedTierIndex],
    rate,
    totalPrice,
    unitPrice: totalPrice === null ? null : totalPrice / safeQuantity,
  };
}
