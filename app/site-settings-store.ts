import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { cache } from "react";
import { contact } from "./site-content";

const SETTINGS_FILE = "site-settings.json";
let settingsWriteQueue = Promise.resolve();

export type SiteSettings = {
  hero: {
    eyebrow: string;
    titleLineOne: string;
    titleLineTwo: string;
    description: string;
  };
  contact: {
    phoneDisplay: string;
    phoneHref: string;
    telegram: string;
    telegramDisplay: string;
    vk: string;
    max: string;
    address: string;
    map: string;
  };
};

export const defaultSiteSettings: SiteSettings = {
  hero: {
    eyebrow: "3D-ПЕЧАТЬ / КЕМЕРОВО",
    titleLineOne: "3D-печать на заказ",
    titleLineTwo: "в Кемерово",
    description: "Изготовим одну деталь, прототип или небольшую серию. Можно прислать готовую модель, эскиз или образец.",
  },
  contact: { ...contact },
};

function dataDirectory() {
  const configured = process.env.CATALOG_DATA_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), "data"));
}

function settingsPath() {
  return path.join(dataDirectory(), SETTINGS_FILE);
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ").slice(0, maxLength)
    : "";
}

function cleanUrl(value: unknown, allowedProtocols = ["https:"]) {
  const raw = cleanText(value, 500);
  try {
    const url = new URL(raw);
    if (!allowedProtocols.includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("Проверьте ссылки: они должны начинаться с https://");
  }
}

function phoneHref(phoneDisplay: string) {
  const digits = phoneDisplay.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("Проверьте номер телефона.");
  return `tel:+${digits.startsWith("8") && digits.length === 11 ? `7${digits.slice(1)}` : digits}`;
}

function validSettings(value: unknown): value is SiteSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<SiteSettings>;
  return Boolean(settings.hero?.titleLineOne && settings.hero.titleLineTwo && settings.hero.description && settings.contact?.phoneDisplay && settings.contact.address);
}

async function readSiteSettings() {
  try {
    const parsed = JSON.parse(await readFile(settingsPath(), "utf8")) as { version?: number; settings?: unknown };
    if (parsed.version === 1 && validSettings(parsed.settings)) return parsed.settings;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read site settings", error);
  }
  return defaultSiteSettings;
}

const readSiteSettingsForRequest = cache(readSiteSettings);

export async function getSiteSettings({ requestTime = true }: { requestTime?: boolean } = {}) {
  if (requestTime) await connection();
  return requestTime ? readSiteSettingsForRequest() : readSiteSettings();
}

export function parseSiteSettings(value: unknown): SiteSettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const hero = input.hero && typeof input.hero === "object" ? input.hero as Record<string, unknown> : {};
  const rawContact = input.contact && typeof input.contact === "object" ? input.contact as Record<string, unknown> : {};
  const phoneDisplay = cleanText(rawContact.phoneDisplay, 40);
  const nextSettings: SiteSettings = {
    hero: {
      eyebrow: cleanText(hero.eyebrow, 60),
      titleLineOne: cleanText(hero.titleLineOne, 80),
      titleLineTwo: cleanText(hero.titleLineTwo, 80),
      description: cleanText(hero.description, 300),
    },
    contact: {
      phoneDisplay,
      phoneHref: phoneHref(phoneDisplay),
      telegram: cleanUrl(rawContact.telegram),
      telegramDisplay: cleanText(rawContact.telegramDisplay, 60),
      vk: cleanUrl(rawContact.vk),
      max: cleanUrl(rawContact.max),
      address: cleanText(rawContact.address, 140),
      map: cleanUrl(rawContact.map),
    },
  };

  if (!nextSettings.hero.eyebrow || !nextSettings.hero.titleLineOne || !nextSettings.hero.titleLineTwo || nextSettings.hero.description.length < 20) {
    throw new Error("Заполните главный экран: метку, обе строки заголовка и описание.");
  }
  if (!nextSettings.contact.telegramDisplay || !nextSettings.contact.address) throw new Error("Заполните контактные данные.");
  return nextSettings;
}

async function persistSiteSettings(settings: SiteSettings) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporaryPath = `${settingsPath()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify({ version: 1, settings }, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, settingsPath());
}

export function updateSiteSettings(settings: SiteSettings) {
  const operation = settingsWriteQueue.then(async () => {
    await persistSiteSettings(settings);
    return settings;
  });
  settingsWriteQueue = operation.then(() => undefined, () => undefined);
  return operation;
}
