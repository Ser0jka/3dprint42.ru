import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { catalogModels as seedModels, type CatalogModel } from "./model-catalog-data";

const MAX_MODEL_SIZE = 80 * 1024 * 1024;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const DATA_FILE = "catalog.json";
const CATEGORIES_FILE = "catalog-categories.json";
let writeQueue = Promise.resolve();

type CatalogState = {
  version: 1;
  models: CatalogModel[];
};

function dataDirectory() {
  const configured = process.env.CATALOG_DATA_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), "data"));
}

export function uploadsDirectory() {
  return path.join(dataDirectory(), "uploads");
}

function statePath() {
  return path.join(dataDirectory(), DATA_FILE);
}

function categoriesPath() {
  return path.join(dataDirectory(), CATEGORIES_FILE);
}

function normalizeCategory(value: string) {
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength)
    : "";
}

export function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  return value
    .toLocaleLowerCase("ru")
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function validCatalogModel(value: unknown): value is CatalogModel {
  if (!value || typeof value !== "object") return false;
  const model = value as Partial<CatalogModel>;
  return Boolean(
    model.slug && model.name && model.description && model.category && model.material && model.model &&
    typeof model.price === "number" && Number.isFinite(model.price),
  );
}

export async function getCatalogModels() {
  try {
    const parsed = JSON.parse(await readFile(statePath(), "utf8")) as Partial<CatalogState>;
    if (parsed.version === 1 && Array.isArray(parsed.models)) {
      return parsed.models.filter(validCatalogModel);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read catalog storage", error);
  }

  return [...seedModels];
}

async function persistModels(models: readonly CatalogModel[]) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporaryPath = `${statePath()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify({ version: 1, models }, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, statePath());
}

async function readStoredCategories() {
  try {
    const parsed = JSON.parse(await readFile(categoriesPath(), "utf8")) as { version?: number; categories?: unknown[] };
    if (parsed.version === 1 && Array.isArray(parsed.categories)) {
      return parsed.categories.filter((item): item is string => typeof item === "string").map(normalizeCategory).filter(Boolean);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read catalog categories", error);
  }
  return [];
}

async function persistCategories(categories: readonly string[]) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporaryPath = `${categoriesPath()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify({ version: 1, categories }, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, categoriesPath());
}

export async function getCatalogCategories(models?: readonly CatalogModel[]) {
  const catalog = models || await getCatalogModels();
  const stored = await readStoredCategories();
  return [...new Set([...stored, ...catalog.map((model) => normalizeCategory(model.category))].filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"));
}

export function addCatalogCategory(rawName: string) {
  return queueCatalogOperation(async () => {
    const name = normalizeCategory(rawName);
    if (name.length < 2) throw new Error("Название категории должно содержать минимум 2 символа.");
    const models = await getCatalogModels();
    const categories = await getCatalogCategories(models);
    if (categories.some((category) => category.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) {
      throw new Error("Такая категория уже существует.");
    }
    categories.push(name);
    categories.sort((left, right) => left.localeCompare(right, "ru"));
    await persistCategories(categories);
    return categories;
  });
}

export function renameCatalogCategory(rawPreviousName: string, rawNextName: string) {
  return queueCatalogOperation(async () => {
    const previousName = normalizeCategory(rawPreviousName);
    const nextName = normalizeCategory(rawNextName);
    if (!previousName) throw new Error("Категория не найдена.");
    if (nextName.length < 2) throw new Error("Название категории должно содержать минимум 2 символа.");

    const models = await getCatalogModels();
    const categories = await getCatalogCategories(models);
    const sourceIndex = categories.findIndex((category) => category === previousName);
    if (sourceIndex < 0) throw new Error("Категория не найдена.");
    if (categories.some((category) => category !== previousName && category.toLocaleLowerCase("ru") === nextName.toLocaleLowerCase("ru"))) {
      throw new Error("Категория с таким названием уже существует.");
    }

    models.forEach((model) => {
      if (model.category === previousName) model.category = nextName;
    });
    categories[sourceIndex] = nextName;
    const nextCategories = [...new Set(categories)].sort((left, right) => left.localeCompare(right, "ru"));
    await persistModels(models);
    await persistCategories(nextCategories);
    return { categories: nextCategories, models };
  });
}

export function deleteCatalogCategory(rawName: string) {
  return queueCatalogOperation(async () => {
    const name = normalizeCategory(rawName);
    const models = await getCatalogModels();
    const usedBy = models.filter((model) => model.category === name).length;
    if (usedBy > 0) throw new Error(`Категория используется в ${usedBy} моделях. Сначала перенесите их в другую категорию.`);
    const categories = (await getCatalogCategories(models)).filter((category) => category !== name);
    await persistCategories(categories);
    return categories;
  });
}

function queueCatalogOperation<T>(operation: () => Promise<T>) {
  const queued = writeQueue.then(operation);
  writeQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

export function mutateCatalog<T>(mutation: (models: CatalogModel[]) => Promise<T> | T) {
  return queueCatalogOperation(async () => {
    const models = await getCatalogModels();
    const result = await mutation(models);
    await persistModels(models);
    return result;
  });
}

function isValidStl(bytes: Uint8Array) {
  if (bytes.length >= 84) {
    const triangleCount = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
    if (84 + triangleCount * 50 === bytes.length) return true;
  }

  const sample = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 1_000_000))).toLowerCase();
  return sample.trimStart().startsWith("solid") && sample.includes("facet normal") && sample.includes("endsolid");
}

function isValidStep(bytes: Uint8Array) {
  const head = bytes.subarray(0, Math.min(bytes.length, 1_000_000));
  const tail = bytes.subarray(Math.max(0, bytes.length - 1_000_000));
  if (head.includes(0) || tail.includes(0)) return false;
  const decoder = new TextDecoder();
  const header = decoder.decode(head).toUpperCase();
  const footer = decoder.decode(tail).toUpperCase();
  return (
    header.includes("ISO-10303-21;") &&
    header.includes("HEADER;") &&
    (header.includes("DATA;") || footer.includes("DATA;")) &&
    footer.includes("END-ISO-10303-21;")
  );
}

function modelExtension(file: File, bytes: Uint8Array) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "stl" && isValidStl(bytes)) return "stl";
  if ((extension === "step" || extension === "stp") && isValidStep(bytes)) return extension;
  return "";
}

function imageExtension(file: File, bytes: Uint8Array) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "png" && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])) return "png";
  if ((extension === "jpg" || extension === "jpeg") && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (extension === "webp") {
    const decoder = new TextDecoder("ascii");
    if (decoder.decode(bytes.subarray(0, 4)) === "RIFF" && decoder.decode(bytes.subarray(8, 12)) === "WEBP") return "webp";
  }
  return "";
}

async function saveUpload(file: File, kind: "model" | "image") {
  if (!file.size) return "";
  const maximum = kind === "model" ? MAX_MODEL_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maximum) throw new Error(kind === "model" ? "3D-файл больше 80 МБ." : "Превью больше 8 МБ.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let extension = "";
  if (kind === "model") {
    extension = modelExtension(file, bytes);
    if (!extension) throw new Error("Выберите корректный файл STL, STEP или STP.");
  }
  if (kind === "image") {
    extension = imageExtension(file, bytes);
    if (!extension) throw new Error("Превью должно быть PNG, JPG или WEBP.");
  }

  await mkdir(uploadsDirectory(), { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadsDirectory(), filename), bytes, { mode: 0o600 });
  return `/catalog-files/${filename}`;
}

export async function modelInputFromForm(formData: FormData, current?: CatalogModel) {
  const name = cleanText(formData.get("name"), 100);
  const description = cleanText(formData.get("description"), 600);
  const category = cleanText(formData.get("category"), 80);
  const material = cleanText(formData.get("material"), 120);
  const price = Number(cleanText(formData.get("price"), 12));
  const requestedSlug = slugify(cleanText(formData.get("slug"), 100) || name);
  const modelFile = formData.get("model");
  const imageFile = formData.get("image");

  if (name.length < 2) throw new Error("Название должно содержать минимум 2 символа.");
  if (description.length < 10) throw new Error("Добавьте короткое описание модели.");
  if (!category) throw new Error("Укажите категорию.");
  if (!material) throw new Error("Укажите материал.");
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) throw new Error("Проверьте стоимость.");
  if (!requestedSlug) throw new Error("Не удалось сформировать адрес модели.");

  let model = current?.model || "";
  let image = current?.image;
  const savedFiles: string[] = [];

  try {
    if (modelFile instanceof File && modelFile.size > 0) {
      model = await saveUpload(modelFile, "model");
      savedFiles.push(model);
    }
    if (imageFile instanceof File && imageFile.size > 0) {
      image = await saveUpload(imageFile, "image");
      savedFiles.push(image);
    }
  } catch (error) {
    await Promise.all(savedFiles.map(removeManagedFile));
    throw error;
  }

  if (!model) throw new Error("Выберите файл STL, STEP или STP.");
  return { slug: requestedSlug, name, description, category, material, price, model, image } satisfies CatalogModel;
}

export async function removeManagedFile(url: string | undefined) {
  if (!url?.startsWith("/catalog-files/")) return;
  const filename = path.basename(url);
  if (filename !== url.slice("/catalog-files/".length)) return;
  await unlink(path.join(uploadsDirectory(), filename)).catch(() => undefined);
}
