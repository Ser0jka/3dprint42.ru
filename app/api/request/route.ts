import { PERSONAL_DATA_CONSENT_VERSION } from "@/app/consent";
import { createSiteRequest } from "@/app/request-store";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 512 * 1024;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 4;

const allowedExtensions = new Set([
  "stl",
  "step",
  "stp",
  "obj",
  "3mf",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

const blockedExtensionPattern = /\.(?:exe|com|bat|cmd|msi|scr|dll|jar|js|mjs|cjs|vbs|ps1|sh|php|py|rb|pl)(?:\.|$)/i;
const requestLog = new Map<string, number[]>();

type FileValidation =
  | { valid: true; mimeType: string }
  | { valid: false; message: string };

function json(message: string, status: number) {
  return Response.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function requestOriginIsAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!expectedHost) return false;

  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_REQUESTS) {
    requestLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

function normalizeText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function normalizeFilename(filename: string) {
  const normalized = filename.normalize("NFKC").trim();

  if (
    normalized.length < 3 ||
    normalized.length > 120 ||
    /[\\/\u0000-\u001F\u007F]/.test(normalized) ||
    blockedExtensionPattern.test(normalized)
  ) {
    return "";
  }

  return normalized;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function looksLikeExecutable(bytes: Uint8Array) {
  const signatures = [
    [0x4d, 0x5a],
    [0x7f, 0x45, 0x4c, 0x46],
    [0xfe, 0xed, 0xfa, 0xce],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xcf, 0xfa, 0xed, 0xfe],
    [0xca, 0xfe, 0xba, 0xbe],
    [0xbe, 0xba, 0xfe, 0xca],
  ];

  return signatures.some((signature) => startsWith(bytes, signature));
}

function isMostlyText(bytes: Uint8Array) {
  if (bytes.includes(0)) return false;
  const sample = bytes.subarray(0, Math.min(bytes.length, 32_768));
  let printable = 0;

  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13 || byte >= 32) printable += 1;
  }

  return printable / Math.max(sample.length, 1) > 0.97;
}

function validateFileContent(extension: string, bytes: Uint8Array): FileValidation {
  if (looksLikeExecutable(bytes)) {
    return { valid: false, message: "Исполняемые файлы запрещены." };
  }

  if (extension === "png") {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ? { valid: true, mimeType: "image/png" }
      : { valid: false, message: "Содержимое PNG-файла не прошло проверку." };
  }

  if (extension === "jpg" || extension === "jpeg") {
    return startsWith(bytes, [0xff, 0xd8, 0xff])
      ? { valid: true, mimeType: "image/jpeg" }
      : { valid: false, message: "Содержимое JPG-файла не прошло проверку." };
  }

  if (extension === "webp") {
    const riff = new TextDecoder("ascii").decode(bytes.subarray(0, 4)) === "RIFF";
    const webp = new TextDecoder("ascii").decode(bytes.subarray(8, 12)) === "WEBP";
    return riff && webp
      ? { valid: true, mimeType: "image/webp" }
      : { valid: false, message: "Содержимое WEBP-файла не прошло проверку." };
  }

  if (extension === "pdf") {
    return new TextDecoder("ascii").decode(bytes.subarray(0, 5)) === "%PDF-"
      ? { valid: true, mimeType: "application/pdf" }
      : { valid: false, message: "Содержимое PDF-файла не прошло проверку." };
  }

  if (extension === "3mf") {
    if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
      return { valid: false, message: "Содержимое 3MF-файла не прошло проверку." };
    }

    const archiveIndex = new TextDecoder("latin1").decode(bytes);
    const hasManifest = archiveIndex.includes("[Content_Types].xml");
    const hasModel = /3D\/[^\u0000-\r]*\.model/i.test(archiveIndex);
    const hasBlockedPayload = blockedExtensionPattern.test(archiveIndex);

    return hasManifest && hasModel && !hasBlockedPayload
      ? { valid: true, mimeType: "model/3mf" }
      : { valid: false, message: "Архив не является безопасным 3MF-файлом." };
  }

  if (extension === "stl") {
    if (bytes.length >= 84) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const triangleCount = view.getUint32(80, true);
      if (84 + triangleCount * 50 === bytes.length) {
        return { valid: true, mimeType: "model/stl" };
      }
    }

    if (isMostlyText(bytes)) {
      const text = new TextDecoder().decode(bytes).trim().toLowerCase();
      if (text.startsWith("solid") && text.includes("facet normal") && text.includes("endsolid")) {
        return { valid: true, mimeType: "model/stl" };
      }
    }

    return { valid: false, message: "Содержимое STL-файла не прошло проверку." };
  }

  if (extension === "step" || extension === "stp") {
    if (isMostlyText(bytes)) {
      const text = new TextDecoder().decode(bytes).toUpperCase();
      if (text.includes("ISO-10303-21;") && text.includes("END-ISO-10303-21;")) {
        return { valid: true, mimeType: "model/step" };
      }
    }

    return { valid: false, message: "Содержимое STEP-файла не прошло проверку." };
  }

  if (extension === "obj" && isMostlyText(bytes)) {
    const text = new TextDecoder().decode(bytes);
    if (/^(?:v|vn|vt)\s+[-+\d.]/m.test(text) && /^f\s+\d/m.test(text)) {
      return { valid: true, mimeType: "model/obj" };
    }
  }

  return { valid: false, message: "Содержимое файла не соответствует его формату." };
}

export async function POST(request: Request) {
  if (!requestOriginIsAllowed(request)) {
    return json("Запрос отклонён. Обновите страницу и попробуйте ещё раз.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_SIZE) {
    return json("Файл слишком большой. Максимальный размер — 15 МБ.", 413);
  }

  if (isRateLimited(requestIp(request))) {
    return json("Слишком много попыток. Подождите 15 минут и повторите отправку.", 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json("Не удалось прочитать форму. Обновите страницу и попробуйте ещё раз.", 400);
  }

  if (normalizeText(formData.get("website"), 200)) {
    return json("Заявка отправлена.", 200);
  }

  const name = normalizeText(formData.get("name"), 80);
  const phone = normalizeText(formData.get("phone"), 24);
  const calculation = normalizeText(formData.get("calculation"), 400);
  const requestType = normalizeText(formData.get("requestType"), 16);
  const isQuizRequest = requestType === "quiz";
  const consent = normalizeText(formData.get("consent"), 60);
  const uploadedFile = formData.get("file");
  const hasFile = uploadedFile instanceof File && uploadedFile.size > 0;

  if (name.length < 2) return json("Укажите имя длиной от 2 символов.", 400);
  if (!/^[+\d\s()@._a-zA-Zа-яА-ЯёЁ-]{6,24}$/.test(phone)) return json("Проверьте формат телефона или мессенджера.", 400);
  if (consent !== PERSONAL_DATA_CONSENT_VERSION) return json("Подтвердите согласие на обработку данных.", 400);
  if (!hasFile && !isQuizRequest) {
    return json("Приложите файл для оценки.", 400);
  }

  let filename = "";
  let bytes: Uint8Array<ArrayBuffer> | null = null;
  let mimeType = "";

  if (hasFile) {
    const file = uploadedFile as File;
    if (file.size > MAX_FILE_SIZE) {
      return json("Файл слишком большой. Максимальный размер — 15 МБ.", 413);
    }

    filename = normalizeFilename(file.name);
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    if (!filename || !allowedExtensions.has(extension)) {
      return json("Этот тип файла запрещён. Выберите модель или изображение из списка форматов.", 400);
    }

    bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateFileContent(extension, bytes);
    if (!validation.valid) return json(validation.message, 400);
    mimeType = validation.mimeType;
  }

  try {
    await createSiteRequest({
      requestType: isQuizRequest ? "quiz" : "form",
      name,
      phone,
      details: calculation,
      sourcePage: request.headers.get("referer")?.slice(0, 500) || "",
      ipAddress: requestIp(request),
      userAgent: request.headers.get("user-agent") || "",
      attachment: bytes && filename ? { originalName: filename, mimeType, bytes } : undefined,
    });
  } catch (error) {
    console.error("Failed to persist site request", error);
    return json("Не удалось сохранить заявку. Попробуйте ещё раз через минуту.", 500);
  }

  return json("Заявка сохранена. Мы свяжемся с вами в ближайшее время.", 200);
}
