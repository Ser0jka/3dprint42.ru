export const siteRoutes = {
  home: "/",
  services: "/3d-pechat-na-zakaz",
  materials: "/plastik-dlya-3d-pechati",
  cases: "/primery-3d-pechati",
  process: "/process-3d-pechati",
  models: "/katalog-3d-modelej",
  calculator: "/kalkulyator-3d-pechati",
  quiz: "/#quiz",
  contact: "/kontakty",
  privacy: "/privacy",
} as const;

export const serviceRoutes = {
  "functional-parts": "/3d-pechat-detalej",
  figurines: "/3d-pechat-figurok",
  prototypes: "/prototipirovanie",
  "small-series": "/melkoseriynoe-proizvodstvo",
  "model-preparation": "/3d-modelirovanie",
  "reverse-engineering": "/revers-inzhiniring",
  "3d-scanning": "/3d-skanirovanie",
} as const;

export const materialRoutes = {
  pla: "/3d-pechat-pla",
  petg: "/3d-pechat-petg",
  abs: "/3d-pechat-abs",
  tpu: "/3d-pechat-tpu",
} as const;

export type ServiceId = keyof typeof serviceRoutes;
export type MaterialId = keyof typeof materialRoutes;

export const legacyRedirects = [
  { source: "/services", destination: siteRoutes.services },
  { source: "/services/functional-parts", destination: serviceRoutes["functional-parts"] },
  { source: "/services/figurines", destination: serviceRoutes.figurines },
  { source: "/services/prototypes", destination: serviceRoutes.prototypes },
  { source: "/services/small-series", destination: serviceRoutes["small-series"] },
  { source: "/services/model-preparation", destination: serviceRoutes["model-preparation"] },
  { source: "/services/reverse-engineering", destination: serviceRoutes["reverse-engineering"] },
  { source: "/services/3d-scanning", destination: serviceRoutes["3d-scanning"] },
  { source: "/materials", destination: siteRoutes.materials },
  { source: "/materials/pla", destination: materialRoutes.pla },
  { source: "/materials/petg", destination: materialRoutes.petg },
  { source: "/materials/abs", destination: materialRoutes.abs },
  { source: "/materials/tpu", destination: materialRoutes.tpu },
  { source: "/cases", destination: siteRoutes.cases },
  { source: "/process", destination: siteRoutes.process },
  { source: "/models", destination: siteRoutes.models },
  { source: "/calculator", destination: siteRoutes.quiz },
  { source: siteRoutes.calculator, destination: siteRoutes.quiz },
  { source: "/contact", destination: siteRoutes.contact },
] as const;

export const seoRewrites = [
  { source: siteRoutes.services, destination: "/services" },
  { source: serviceRoutes["functional-parts"], destination: "/services/functional-parts" },
  { source: serviceRoutes.figurines, destination: "/services/figurines" },
  { source: serviceRoutes.prototypes, destination: "/services/prototypes" },
  { source: serviceRoutes["small-series"], destination: "/services/small-series" },
  { source: serviceRoutes["model-preparation"], destination: "/services/model-preparation" },
  { source: serviceRoutes["reverse-engineering"], destination: "/services/reverse-engineering" },
  { source: serviceRoutes["3d-scanning"], destination: "/services/3d-scanning" },
  { source: siteRoutes.materials, destination: "/materials" },
  { source: materialRoutes.pla, destination: "/materials/pla" },
  { source: materialRoutes.petg, destination: "/materials/petg" },
  { source: materialRoutes.abs, destination: "/materials/abs" },
  { source: materialRoutes.tpu, destination: "/materials/tpu" },
  { source: siteRoutes.cases, destination: "/cases" },
  { source: siteRoutes.process, destination: "/process" },
  { source: siteRoutes.contact, destination: "/contact" },
] as const;
