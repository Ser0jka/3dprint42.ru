import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const SOURCE_LIMIT = 192 * 1024;
const PREVIEW_LIMIT = 1_100;
const DEFAULT_POLL_SECONDS = 45;

loadEnvironment();

const telegram = telegramSettings();
const accounts = [
  mailAccount("yandex", "Яндекс", "imap.yandex.ru", "https://mail.yandex.ru/", "MAIL_YANDEX_USER", "MAIL_YANDEX_APP_PASSWORD"),
  mailAccount("gmail", "Gmail", "imap.gmail.com", "https://mail.google.com/", "MAIL_GMAIL_USER", "MAIL_GMAIL_APP_PASSWORD"),
].filter(Boolean);

if (!telegram) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_NOTIFY_CHAT_ID are required");
if (!accounts.length) throw new Error("No mail accounts are configured");

const pollSeconds = integerEnv("MAIL_NOTIFIER_POLL_SECONDS", DEFAULT_POLL_SECONDS, 15, 900);
const statePath = resolve(process.env.MAIL_NOTIFIER_STATE_FILE || "./data/mail-notifier-state.json");
const senderRules = {
  allowed: splitList(process.env.MAIL_ALLOWED_SENDERS),
  blocked: splitList(process.env.MAIL_BLOCKED_SENDERS),
};
const state = readState(statePath);

console.log(`Mail notifier started for ${accounts.map((account) => account.label).join(", ")}`);
await Promise.all(accounts.map((account) => monitorAccount(account)));

function loadEnvironment() {
  const candidates = [
    process.env.MAIL_NOTIFIER_ENV_FILE,
    "/var/www/3dprint42/shared/.env.production",
    resolve(".env.production"),
    resolve(".env.local"),
  ].filter(Boolean);
  const envPath = candidates.find((candidate) => existsSync(candidate));
  if (envPath) dotenv.config({ path: envPath, override: false, quiet: true });
}

function telegramSettings() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatIds = String(process.env.TELEGRAM_NOTIFY_CHAT_ID || "")
    .split(",")
    .map((chatId) => chatId.trim())
    .filter((chatId) => /^-?\d+$/.test(chatId));
  const rawBaseUrl = process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token) || !chatIds.length) return null;

  const url = new URL(rawBaseUrl);
  if (url.protocol !== "https:") throw new Error("TELEGRAM_API_BASE must use HTTPS");
  return { token, chatIds: [...new Set(chatIds)], baseUrl: url.toString().replace(/\/$/, "") };
}

function mailAccount(key, label, host, inboxUrl, userEnv, passwordEnv) {
  const user = process.env[userEnv]?.trim() || "";
  const pass = process.env[passwordEnv]?.replace(/\s+/g, "") || "";
  if (!user && !pass) return null;
  if (!user || !pass) throw new Error(`${userEnv} and ${passwordEnv} must both be set`);
  return { key, label, host, inboxUrl, user, pass };
}

async function monitorAccount(account) {
  while (true) {
    let client;
    try {
      client = new ImapFlow({
        host: account.host,
        port: 993,
        secure: true,
        auth: { user: account.user, pass: account.pass },
        logger: false,
        disableAutoIdle: true,
      });
      client.on("error", (error) => console.error(`[${account.label}] IMAP error:`, error.message));
      await client.connect();
      const mailbox = await client.mailboxOpen("INBOX", { readOnly: true });
      initialiseCursor(account, mailbox);
      await processNewMessages(client, account, mailbox);
      await client.logout();
      client = undefined;
    } catch (error) {
      console.error(`[${account.label}] poll failed:`, readableError(error));
    } finally {
      if (client?.usable) await client.logout().catch(() => undefined);
    }
    await sleep(pollSeconds * 1_000);
  }
}

function initialiseCursor(account, mailbox) {
  const uidValidity = String(mailbox.uidValidity || "");
  const cursor = state.accounts[account.key];
  if (!cursor || cursor.uidValidity !== uidValidity) {
    state.accounts[account.key] = {
      uidValidity,
      lastUid: Math.max(0, Number(mailbox.uidNext || 1) - 1),
    };
    saveState();
    console.log(`[${account.label}] cursor initialized; existing messages will not be forwarded`);
  }
}

async function processNewMessages(client, account, mailbox) {
  const cursor = state.accounts[account.key];
  const currentUidValidity = String(mailbox.uidValidity || "");
  if (cursor.uidValidity !== currentUidValidity) {
    initialiseCursor(account, mailbox);
    return;
  }

  const foundUids = await client.search({ uid: `${cursor.lastUid + 1}:*` }, { uid: true });
  const uids = foundUids?.filter((uid) => uid > cursor.lastUid) || [];
  if (!uids.length) return;

  const messages = await client.fetchAll(
    uids,
    {
      uid: true,
      envelope: true,
      size: true,
      source: { start: 0, maxLength: SOURCE_LIMIT },
    },
    { uid: true },
  );

  messages.sort((left, right) => left.uid - right.uid);
  for (const message of messages) {
    if (message.uid <= cursor.lastUid) continue;
    const parsed = await parseMessage(message.source);
    const sender = senderDetails(message.envelope, parsed);

    if (shouldNotify(parsed, sender.address, senderRules)) {
      await sendMailNotification(account, message, parsed, sender);
      console.log(`[${account.label}] forwarded UID ${message.uid} from ${sender.address || "unknown"}`);
    } else {
      console.log(`[${account.label}] skipped automated/bulk UID ${message.uid} from ${sender.address || "unknown"}`);
    }

    cursor.lastUid = message.uid;
    saveState();
  }
}

async function parseMessage(source) {
  if (!source) return { headers: new Map(), subject: "", text: "", html: "", attachments: [] };
  try {
    return await simpleParser(source, {
      skipHtmlToText: false,
      skipTextToHtml: true,
      maxHtmlLengthToParse: SOURCE_LIMIT,
    });
  } catch (error) {
    console.error("Could not parse message source:", error instanceof Error ? error.message : error);
    return { headers: new Map(), subject: "", text: "", html: "", attachments: [] };
  }
}

function senderDetails(envelope, parsed) {
  const parsedSender = parsed.from?.value?.[0];
  const envelopeSender = envelope?.from?.[0];
  const name = cleanLine(parsedSender?.name || envelopeSender?.name || "");
  const address = cleanLine(parsedSender?.address || envelopeSender?.address || "").toLowerCase();
  return { name, address };
}

function shouldNotify(parsed, senderAddress, rules) {
  if (matchesRule(senderAddress, rules.blocked)) return false;
  if (matchesRule(senderAddress, rules.allowed)) return true;

  const localPart = senderAddress.split("@")[0] || "";
  if (/^(?:no[-_.]?reply|do[-_.]?not[-_.]?reply|mailer[-_.]?daemon|postmaster|notifications?|newsletter|digest|robot|bounce)/i.test(localPart)) {
    return false;
  }

  const header = (name) => headerText(parsed.headers, name).toLowerCase();
  const autoSubmitted = header("auto-submitted");
  if (autoSubmitted && autoSubmitted !== "no") return false;
  if (/bulk|list|junk/.test(header("precedence"))) return false;
  if (header("list-id") || header("list-unsubscribe")) return false;
  if (header("x-auto-response-suppress") || header("x-autoreply") || header("x-autorespond")) return false;
  return Boolean(senderAddress);
}

function headerText(headers, name) {
  const value = headers?.get?.(name);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value || "");
}

function matchesRule(address, rules) {
  return rules.some((rule) => rule.startsWith("@") ? address.endsWith(rule) : address === rule || address.endsWith(`@${rule}`));
}

async function sendMailNotification(account, message, parsed, sender) {
  const subject = cleanLine(parsed.subject || message.envelope?.subject || "Без темы").slice(0, 300);
  const from = sender.name ? `${sender.name} <${sender.address}>` : sender.address || "Неизвестный отправитель";
  const preview = messagePreview(parsed);
  const attachmentCount = Array.isArray(parsed.attachments) ? parsed.attachments.length : 0;
  const text = [
    `Новое письмо · ${account.label}`,
    `От: ${from}`,
    `Тема: ${subject}`,
    ...(preview ? [`\n${preview}`] : []),
    ...(attachmentCount ? [`\nВложения: ${attachmentCount}`] : []),
  ].join("\n");

  const results = await Promise.allSettled(telegram.chatIds.map(async (chatId) => {
    const response = await fetch(`${telegram.baseUrl}/bot${telegram.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: `Открыть ${account.label}`, url: account.inboxUrl }]] },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Telegram delivery to ${chatId} failed with status ${response.status}`);
  }));
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) throw new Error(`Telegram delivery failed for ${failed.length} of ${results.length} recipients`);
}

function messagePreview(parsed) {
  const text = typeof parsed.text === "string" ? parsed.text : "";
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, PREVIEW_LIMIT);
}

function cleanLine(value) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function readableError(error) {
  if (!error || typeof error !== "object") return String(error);
  return [error.message, error.responseText, error.serverResponseCode, error.code]
    .map(cleanLine)
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" · ");
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function integerEnv(name, fallback, minimum, maximum) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function readState(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" && parsed.accounts ? parsed : { accounts: {} };
  } catch {
    return { accounts: {} };
  }
}

function saveState() {
  mkdirSync(dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, statePath);
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}
