import "server-only";

import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const USERS_FILE = "team-users.json";
let queue = Promise.resolve();

export type TeamUserStatus = "pending" | "approved" | "rejected";

export type TeamUser = {
  id: string;
  name: string;
  login: string;
  passwordHash: string;
  passwordSalt: string;
  status: TeamUserStatus;
  createdAt: string;
  approvedAt: string | null;
};

type TeamUserState = { version: 1; users: TeamUser[] };

function dataDirectory() {
  const configured = process.env.CATALOG_DATA_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), "data"));
}

function usersPath() {
  return path.join(dataDirectory(), USERS_FILE);
}

function normalizeLogin(value: unknown) {
  return String(value || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "").slice(0, 80);
}

function cleanName(value: unknown) {
  return String(value || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
}

async function readState(): Promise<TeamUserState> {
  try {
    const state = JSON.parse(await readFile(usersPath(), "utf8")) as Partial<TeamUserState>;
    if (state.version === 1 && Array.isArray(state.users)) return { version: 1, users: state.users };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Failed to read team users", error);
  }
  return { version: 1, users: [] };
}

async function persist(state: TeamUserState) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporary = `${usersPath()}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, usersPath());
}

function operation<T>(callback: () => Promise<T>) {
  const next = queue.then(callback);
  queue = next.then(() => undefined, () => undefined);
  return next;
}

async function hashPassword(password: string, salt: string) {
  return Buffer.from(await scrypt(password, salt, 64) as Buffer).toString("base64url");
}

export async function registerTeamUser(input: { name: unknown; login: unknown; password: unknown }) {
  return operation(async () => {
    const name = cleanName(input.name);
    const login = normalizeLogin(input.login);
    const password = String(input.password || "");
    if (name.length < 2) throw new Error("Укажите имя.");
    if (!/^[a-zа-яё0-9@._+-]{3,80}$/i.test(login)) throw new Error("Логин должен содержать не менее трёх символов.");
    if (password.length < 8 || password.length > 128) throw new Error("Пароль должен содержать от 8 до 128 символов.");
    const state = await readState();
    if (state.users.some((user) => user.login === login)) throw new Error("Такой логин уже зарегистрирован.");
    const salt = randomBytes(18).toString("base64url");
    const user: TeamUser = {
      id: randomUUID(), name, login,
      passwordHash: await hashPassword(password, salt), passwordSalt: salt,
      status: "pending", createdAt: new Date().toISOString(), approvedAt: null,
    };
    state.users.push(user);
    await persist(state);
    return publicUser(user);
  });
}

export async function authenticateTeamUser(loginInput: unknown, passwordInput: unknown) {
  const login = normalizeLogin(loginInput);
  const password = String(passwordInput || "");
  const user = (await readState()).users.find((item) => item.login === login);
  if (!user) return null;
  const received = Buffer.from(await hashPassword(password, user.passwordSalt));
  const expected = Buffer.from(user.passwordHash);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return publicUser(user);
}

export async function getTeamUser(id: string) {
  const user = (await readState()).users.find((item) => item.id === id);
  return user ? publicUser(user) : null;
}

export async function getTeamUsers() {
  return (await readState()).users.map(publicUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setTeamUserStatus(id: string, status: TeamUserStatus) {
  return operation(async () => {
    const state = await readState();
    const user = state.users.find((item) => item.id === id);
    if (!user) throw new Error("Пользователь не найден.");
    user.status = status;
    user.approvedAt = status === "approved" ? new Date().toISOString() : null;
    await persist(state);
    return publicUser(user);
  });
}

function publicUser(user: TeamUser) {
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    status: user.status,
    createdAt: user.createdAt,
    approvedAt: user.approvedAt,
  };
}

export type PublicTeamUser = ReturnType<typeof publicUser>;
