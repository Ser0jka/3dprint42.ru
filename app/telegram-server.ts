import "server-only";
import { siteUrl } from "./seo";

export type TelegramSettings = {
  token: string;
  chatId: string;
  baseUrl: string;
};

function readTelegramSettings(chatId: string): TelegramSettings | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const baseUrl = process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";

  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token) || !/^-?\d+$/.test(chatId)) return null;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:") return null;
    return { token, chatId, baseUrl: url.toString().replace(/\/$/, "") };
  } catch {
    return null;
  }
}

export function telegramSettings(): TelegramSettings | null {
  return readTelegramSettings(process.env.TELEGRAM_CHAT_ID?.trim() || "");
}

export function telegramNotificationSettings(): TelegramSettings[] {
  return (process.env.TELEGRAM_NOTIFY_CHAT_ID || "")
    .split(",")
    .map((chatId) => readTelegramSettings(chatId.trim()))
    .filter((settings): settings is TelegramSettings => Boolean(settings));
}

export function telegramRequestNotificationSettings(): TelegramSettings[] {
  const configuredChatIds = (
    process.env.TELEGRAM_REQUEST_CHAT_ID ||
    process.env.TELEGRAM_NOTIFY_CHAT_ID ||
    process.env.TELEGRAM_CHAT_ID ||
    ""
  )
    .split(",")
    .map((chatId) => chatId.trim())
    .filter(Boolean);

  return [...new Set(configuredChatIds)]
    .map((chatId) => readTelegramSettings(chatId))
    .filter((settings): settings is TelegramSettings => Boolean(settings));
}

export async function sendTelegramMessage(
  settings: TelegramSettings,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  const response = await fetch(`${settings.baseUrl}/bot${settings.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: settings.chatId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) throw new Error(`Telegram delivery failed with status ${response.status}`);
}

export async function sendAnonymousRequestTelegramNotification() {
  const recipients = telegramRequestNotificationSettings();
  if (!recipients.length) return { configured: false, sent: 0, failed: 0 };

  const text = [
    "На сайте появилась новая заявка.",
    "Данные доступны только в защищённой админке.",
  ].join("\n\n");
  const replyMarkup = { inline_keyboard: [[{ text: "Открыть доску", url: `${siteUrl}/dashboard` }]] };
  const results = await Promise.allSettled(
    recipients.map((settings) => sendTelegramMessage(settings, text, replyMarkup)),
  );

  return {
    configured: true,
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function sendNewDashboardOrderNotification() {
  const recipients = telegramRequestNotificationSettings();
  if (!recipients.length) return { configured: false, sent: 0, failed: 0 };
  const replyMarkup = { inline_keyboard: [[{ text: "Открыть доску", url: `${siteUrl}/dashboard` }]] };
  const results = await Promise.allSettled(recipients.map((settings) => sendTelegramMessage(
    settings,
    "В столбце «Новые» появилась заявка. Можно открыть описание и предложить цену.",
    replyMarkup,
  )));
  return {
    configured: true,
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
