import { timingSafeEqual } from "node:crypto";
import { sendTelegramMessage, telegramNotificationSettings } from "@/app/telegram-server";

const MAX_CALLBACK_SIZE = 256 * 1024;
const handledEvents = new Map<string, number>();

type VkAttachment = {
  type?: string;
};

type VkCallbackPayload = {
  type?: string;
  event_id?: string;
  group_id?: number;
  secret?: string;
  object?: {
    message?: {
      from_id?: number;
      peer_id?: number;
      text?: string;
      attachments?: VkAttachment[];
    };
  };
};

function plainText(value: string, status = 200) {
  return new Response(value, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function callbackSettings() {
  const confirmationCode = process.env.VK_CALLBACK_CONFIRMATION_CODE?.trim() || "";
  const secret = process.env.VK_CALLBACK_SECRET?.trim() || "";
  const communityId = Number(process.env.VK_COMMUNITY_ID);
  const communityScreenName = process.env.VK_COMMUNITY_SCREEN_NAME?.trim() || "center3dkem";

  if (!confirmationCode || secret.length < 16 || !Number.isSafeInteger(communityId) || communityId <= 0) return null;
  return { confirmationCode, secret, communityId, communityScreenName };
}

function wasHandled(eventId: string) {
  const now = Date.now();
  for (const [id, timestamp] of handledEvents) {
    if (now - timestamp > 24 * 60 * 60 * 1000) handledEvents.delete(id);
  }
  if (handledEvents.has(eventId)) return true;
  handledEvents.set(eventId, now);
  return false;
}

function attachmentSummary(attachments: VkAttachment[]) {
  const names: Record<string, string> = {
    photo: "фото",
    video: "видео",
    audio: "аудио",
    doc: "файл",
    link: "ссылка",
    market: "товар",
    market_album: "подборка товаров",
    sticker: "стикер",
    audio_message: "голосовое сообщение",
  };
  const values = attachments.map((attachment) => names[attachment.type || ""] || attachment.type || "вложение");
  return [...new Set(values)].join(", ");
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_CALLBACK_SIZE) return plainText("payload too large", 413);

  const settings = callbackSettings();
  if (!settings) return plainText("callback is not configured", 503);

  let payload: VkCallbackPayload;
  try {
    payload = await request.json() as VkCallbackPayload;
  } catch {
    return plainText("invalid json", 400);
  }

  if (payload.group_id !== settings.communityId || !safeEqual(payload.secret || "", settings.secret)) {
    return plainText("forbidden", 403);
  }

  if (payload.type === "confirmation") return plainText(settings.confirmationCode);
  if (payload.type !== "message_new") return plainText("ok");
  if (payload.event_id && wasHandled(payload.event_id)) return plainText("ok");

  const message = payload.object?.message;
  const senderId = message?.from_id;
  const peerId = message?.peer_id;
  if (!message || !senderId || !peerId) return plainText("ok");

  const text = message.text?.trim().slice(0, 2800) || "Без текста";
  const attachments = attachmentSummary(message.attachments || []);
  const dialogUrl = `https://vk.com/gim${settings.communityId}?sel=${peerId}`;
  const senderUrl = `https://vk.com/id${senderId}`;
  const telegramRecipients = telegramNotificationSettings();

  if (telegramRecipients.length) {
    const results = await Promise.allSettled(
      telegramRecipients.map((telegram) => sendTelegramMessage(
        telegram,
        [
          "Новое сообщение в сообществе VK",
          `Отправитель: ${senderUrl}`,
          `Сообщение: ${text}`,
          ...(attachments ? [`Вложения: ${attachments}`] : []),
        ].join("\n\n"),
        { inline_keyboard: [[{ text: "Открыть диалог в VK", url: dialogUrl }]] },
      )),
    );
    for (const result of results) {
      if (result.status === "rejected") console.error("VK notification delivery failed", result.reason);
    }
  } else {
    console.error("VK notification skipped because Telegram is not configured");
  }

  return plainText("ok");
}
