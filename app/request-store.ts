import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PERSONAL_DATA_CONSENT_TEXT,
  PERSONAL_DATA_CONSENT_VERSION,
  PERSONAL_DATA_POLICY_PATH,
} from "./consent";
import { sendAnonymousRequestTelegramNotification } from "./telegram-server";
import { createWorkspaceOrderFromSiteRequest } from "./workspace-store";

const REQUESTS_FILE = "requests.json";
const REQUEST_FILES_DIRECTORY = "request-files";
let requestWriteQueue = Promise.resolve();

export type SiteRequestStatus = "new" | "in_progress" | "completed";

export type SiteRequest = {
  id: string;
  createdAt: string;
  status: SiteRequestStatus;
  requestType: "form" | "quiz";
  name: string;
  phone: string;
  details: string;
  sourcePage: string;
  attachment: null | {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
  };
  consent: {
    accepted: true;
    acceptedAt: string;
    version: string;
    text: string;
    textSha256: string;
    policyPath: string;
    ipAddress: string;
    userAgent: string;
  };
};

type RequestState = { version: 1; requests: SiteRequest[] };

function dataDirectory() {
  const configured = process.env.CATALOG_DATA_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), "data"));
}

function requestsPath() {
  return path.join(dataDirectory(), REQUESTS_FILE);
}

function requestFilesDirectory() {
  return path.join(dataDirectory(), REQUEST_FILES_DIRECTORY);
}

function validRequest(value: unknown): value is SiteRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<SiteRequest>;
  return Boolean(
    request.id && request.createdAt && request.name && request.phone && request.consent?.accepted &&
    ["new", "in_progress", "completed"].includes(request.status || ""),
  );
}

async function readRequests() {
  try {
    const state = JSON.parse(await readFile(requestsPath(), "utf8")) as Partial<RequestState>;
    if (state.version === 1 && Array.isArray(state.requests)) return state.requests.filter(validRequest);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read request storage", error);
  }
  return [];
}

async function persistRequests(requests: readonly SiteRequest[]) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporaryPath = `${requestsPath()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify({ version: 1, requests }, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, requestsPath());
}

function queueRequestOperation<T>(operation: () => Promise<T>) {
  const queued = requestWriteQueue.then(operation);
  requestWriteQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

export async function getSiteRequests() {
  const requests = await readRequests();
  return requests.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createSiteRequest(input: {
  requestType: "form" | "quiz";
  name: string;
  phone: string;
  details: string;
  sourcePage: string;
  ipAddress: string;
  userAgent: string;
  attachment?: { originalName: string; mimeType: string; bytes: Uint8Array<ArrayBuffer> };
}) {
  return queueRequestOperation(async () => {
    const id = randomUUID();
    const acceptedAt = new Date().toISOString();
    let attachment: SiteRequest["attachment"] = null;

    if (input.attachment) {
      const extension = input.attachment.originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const storedName = `${id}.${extension}`;
      await mkdir(requestFilesDirectory(), { recursive: true });
      await writeFile(path.join(requestFilesDirectory(), storedName), input.attachment.bytes, { mode: 0o600 });
      attachment = {
        originalName: input.attachment.originalName,
        storedName,
        mimeType: input.attachment.mimeType,
        size: input.attachment.bytes.byteLength,
      };
    }

    const siteRequest: SiteRequest = {
      id,
      createdAt: acceptedAt,
      status: "new",
      requestType: input.requestType,
      name: input.name,
      phone: input.phone,
      details: input.details,
      sourcePage: input.sourcePage,
      attachment,
      consent: {
        accepted: true,
        acceptedAt,
        version: PERSONAL_DATA_CONSENT_VERSION,
        text: PERSONAL_DATA_CONSENT_TEXT,
        textSha256: createHash("sha256").update(PERSONAL_DATA_CONSENT_TEXT, "utf8").digest("hex"),
        policyPath: PERSONAL_DATA_POLICY_PATH,
        ipAddress: input.ipAddress.slice(0, 100),
        userAgent: input.userAgent.slice(0, 500),
      },
    };

    const requests = await readRequests();
    requests.push(siteRequest);
    await persistRequests(requests);
    await createWorkspaceOrderFromSiteRequest(siteRequest).catch((error) => {
      console.error("Failed to create production order from site request", error);
    });
    await sendAnonymousRequestTelegramNotification().then((result) => {
      if (result.configured && result.failed) {
        console.error(`Anonymous Telegram notification failed for ${result.failed} recipient(s)`);
      }
    }).catch((error) => {
      console.error("Failed to send anonymous Telegram notification", error);
    });
    return siteRequest;
  });
}

export function updateSiteRequestStatus(id: string, status: SiteRequestStatus) {
  return queueRequestOperation(async () => {
    const requests = await readRequests();
    const request = requests.find((item) => item.id === id);
    if (!request) throw new Error("Заявка не найдена.");
    request.status = status;
    await persistRequests(requests);
    return request;
  });
}

export function deleteSiteRequest(id: string) {
  return queueRequestOperation(async () => {
    const requests = await readRequests();
    const request = requests.find((item) => item.id === id);
    if (!request) throw new Error("Заявка не найдена.");
    await persistRequests(requests.filter((item) => item.id !== id));
    if (request.attachment) {
      await rm(path.join(requestFilesDirectory(), request.attachment.storedName), { force: true });
    }
  });
}

export async function readSiteRequestAttachment(id: string) {
  const request = (await readRequests()).find((item) => item.id === id);
  if (!request?.attachment) return null;
  const safePath = path.join(requestFilesDirectory(), path.basename(request.attachment.storedName));
  return { request, bytes: await readFile(safePath) };
}
