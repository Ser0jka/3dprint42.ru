import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SiteRequest } from "./request-store";
import type {
  CompensationMode,
  MaterialSource,
  WorkOrder,
  WorkOrderStatus,
  WorkspaceAction,
  WorkspaceState,
  WorkStepStatus,
  WorkType,
} from "./workspace-types";

const WORKSPACE_FILE = "workspace.json";
let workspaceWriteQueue = Promise.resolve();

const orderStatuses: WorkOrderStatus[] = ["new", "in_progress", "agreement", "paid", "task", "idea"];
const stepStatuses: WorkStepStatus[] = ["open", "bidding", "assigned", "done"];
const compensationModes: CompensationMode[] = ["percent", "fixed", "bid"];
const materialSources: MaterialSource[] = ["office", "contractor", "client"];

const defaultWorkTypes: WorkType[] = [
  { id: "printing", name: "3D-печать", compensationMode: "bid", defaultValue: 0, autoAddToNewOrder: true, reimbursesMaterials: true, active: true },
  { id: "modeling", name: "3D-моделирование", compensationMode: "bid", defaultValue: 0, autoAddToNewOrder: true, reimbursesMaterials: false, active: true },
  { id: "printer-setup", name: "Настройка принтера", compensationMode: "bid", defaultValue: 0, autoAddToNewOrder: false, reimbursesMaterials: false, active: true },
  { id: "resin-printing", name: "Фотополимерная печать", compensationMode: "percent", defaultValue: 20, autoAddToNewOrder: false, reimbursesMaterials: true, active: true },
  { id: "post-processing", name: "Постобработка", compensationMode: "bid", defaultValue: 0, autoAddToNewOrder: false, reimbursesMaterials: false, active: true },
  { id: "meeting", name: "Встреча / приём детали", compensationMode: "fixed", defaultValue: 0, autoAddToNewOrder: false, reimbursesMaterials: false, active: true },
  { id: "idea", name: "Идея / проработка", compensationMode: "bid", defaultValue: 0, autoAddToNewOrder: false, reimbursesMaterials: false, active: true },
];

function defaultState(): WorkspaceState {
  return {
    version: 1,
    members: [
      { id: "sergey", name: "Сергей", contact: "", active: true },
    ],
    workTypes: defaultWorkTypes.map((workType) => ({ ...workType })),
    orders: [],
    dismissedRequestIds: [],
  };
}

function dataDirectory() {
  const configured = process.env.CATALOG_DATA_DIR?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || path.join(process.cwd(), "data"));
}

function workspacePath() {
  return path.join(dataDirectory(), WORKSPACE_FILE);
}

function finiteNonNegative(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function validState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<WorkspaceState>;
  return state.version === 1 && Array.isArray(state.members) && Array.isArray(state.workTypes) && Array.isArray(state.orders);
}

async function readWorkspace() {
  try {
    const parsed = JSON.parse(await readFile(workspacePath(), "utf8")) as unknown;
    if (validState(parsed)) {
      const legacyStatus: Record<string, WorkOrderStatus> = {
        new: "new",
        distribution: "new",
        in_progress: "in_progress",
        ready: "agreement",
        agreement: "agreement",
        completed: "paid",
        paid: "paid",
        task: "task",
        idea: "idea",
      };
      const migratedWorkTypes = parsed.workTypes.map((workType) => {
        if (workType.id === "printing") return { ...workType, compensationMode: "bid" as const, defaultValue: 0, autoAddToNewOrder: true };
        if (workType.id === "modeling") return { ...workType, compensationMode: "bid" as const, defaultValue: 0, autoAddToNewOrder: true };
        if (workType.id === "agreement") return { ...workType, autoAddToNewOrder: false };
        return workType;
      });
      return {
        ...parsed,
        workTypes: migratedWorkTypes,
        dismissedRequestIds: Array.isArray(parsed.dismissedRequestIds) ? parsed.dismissedRequestIds : [],
        orders: parsed.orders.map((order) => {
          const steps = order.steps.map((step) => ({
            ...step,
            bids: step.bids.map((bid) => ({ ...bid, material: bid.material || "", leadTime: bid.leadTime || "" })),
          }));
          for (const typeId of ["printing", "modeling"]) {
            const workType = migratedWorkTypes.find((item) => item.id === typeId && item.active);
            if (workType && !steps.some((step) => step.typeId === typeId)) {
              steps.push({ ...workStep(workType), id: `migration-${order.id}-${typeId}` });
            }
          }
          return {
            ...order,
            status: legacyStatus[order.status] || "new",
            responsibleId: typeof order.responsibleId === "string" ? order.responsibleId : null,
            auctionClosedAt: typeof order.auctionClosedAt === "string" ? order.auctionClosedAt : null,
            questions: Array.isArray(order.questions) ? order.questions : [],
            steps,
          };
        }),
      };
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to read production workspace", error);
  }
  return defaultState();
}

async function persistWorkspace(state: WorkspaceState) {
  await mkdir(dataDirectory(), { recursive: true });
  const temporaryPath = `${workspacePath()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, workspacePath());
}

function queueWorkspaceOperation<T>(operation: () => Promise<T>) {
  const queued = workspaceWriteQueue.then(operation);
  workspaceWriteQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

function workStep(workType: WorkType) {
  return {
    id: randomUUID(),
    typeId: workType.id,
    title: workType.name,
    status: workType.compensationMode === "bid" ? "bidding" as const : "open" as const,
    assignedTo: null,
    compensationMode: workType.compensationMode,
    value: workType.defaultValue,
    agreedAmount: null,
    bids: [],
    completedAt: null,
  };
}

function orderFromRequest(request: SiteRequest, state: WorkspaceState): WorkOrder {
  return {
    id: randomUUID(),
    requestId: request.id,
    createdAt: request.createdAt,
    updatedAt: request.createdAt,
    title: cleanText(request.details, 80) || `Заявка от ${request.name}`,
    clientName: cleanText(request.name, 100),
    clientContact: cleanText(request.phone, 120),
    details: cleanText(request.details, 2000),
    responsibleId: null,
    status: "new",
    finalPrice: 0,
    materialSource: "office",
    materialOwnerId: null,
    materialCost: 0,
    deadline: "",
    notes: request.attachment ? `Приложен файл: ${request.attachment.originalName}` : "",
    auctionClosedAt: null,
    questions: [],
    steps: state.workTypes.filter((type) => type.active && type.autoAddToNewOrder).map(workStep),
    adjustments: [],
  };
}

function findOrder(state: WorkspaceState, orderId: string) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("Заказ не найден.");
  return order;
}

function findStep(order: WorkOrder, stepId: string) {
  const step = order.steps.find((item) => item.id === stepId);
  if (!step) throw new Error("Работа не найдена.");
  return step;
}

function requireMember(state: WorkspaceState, memberId: string) {
  const member = state.members.find((item) => item.id === memberId && item.active);
  if (!member) throw new Error("Исполнитель не найден или отключён.");
  return member;
}

function normalizeWorkType(input: Omit<WorkType, "id">): Omit<WorkType, "id"> {
  const mode = compensationModes.includes(input.compensationMode) ? input.compensationMode : "fixed";
  return {
    name: cleanText(input.name, 100),
    compensationMode: mode,
    defaultValue: finiteNonNegative(input.defaultValue),
    autoAddToNewOrder: Boolean(input.autoAddToNewOrder),
    reimbursesMaterials: Boolean(input.reimbursesMaterials),
    active: Boolean(input.active),
  };
}

export async function getWorkspaceState() {
  const state = await readWorkspace();
  return {
    ...state,
    orders: [...state.orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}

export function syncSiteRequestsToWorkspace(requests: readonly SiteRequest[]) {
  return queueWorkspaceOperation(async () => {
    const state = await readWorkspace();
    const known = new Set(state.orders.map((order) => order.requestId).filter(Boolean));
    const dismissed = new Set(state.dismissedRequestIds);
    const missing = requests.filter((request) => !known.has(request.id) && !dismissed.has(request.id));
    if (missing.length === 0) return state;
    state.orders.push(...missing.map((request) => orderFromRequest(request, state)));
    await persistWorkspace(state);
    return state;
  });
}

export function createWorkspaceOrderFromSiteRequest(request: SiteRequest) {
  return syncSiteRequestsToWorkspace([request]);
}

export function applyWorkspaceAction(action: WorkspaceAction) {
  return queueWorkspaceOperation(async () => {
    const state = await readWorkspace();
    const now = new Date().toISOString();

    if (action.type === "create_order") {
      const title = cleanText(action.order.title, 120);
      if (!title) throw new Error("Укажите название заказа.");
      state.orders.push({
        id: randomUUID(), requestId: null, createdAt: now, updatedAt: now, title,
        clientName: cleanText(action.order.clientName, 100),
        clientContact: cleanText(action.order.clientContact, 120),
        details: cleanText(action.order.details, 2000),
        responsibleId: action.order.responsibleId ? requireMember(state, action.order.responsibleId).id : null,
        status: "new", finalPrice: finiteNonNegative(action.order.finalPrice),
        materialSource: "office", materialOwnerId: null, materialCost: 0,
        deadline: cleanText(action.order.deadline, 30), notes: "", auctionClosedAt: null, questions: [],
        steps: state.workTypes.filter((type) => type.active && type.autoAddToNewOrder).map(workStep), adjustments: [],
      });
    }

    if (action.type === "delete_order") {
      const order = findOrder(state, action.orderId);
      if (order.requestId && !state.dismissedRequestIds.includes(order.requestId)) state.dismissedRequestIds.push(order.requestId);
      state.orders = state.orders.filter((item) => item.id !== action.orderId);
    }

    if (action.type === "update_order") {
      const order = findOrder(state, action.orderId);
      const patch = action.patch;
      if (patch.title !== undefined) order.title = cleanText(patch.title, 120) || order.title;
      if (patch.clientName !== undefined) order.clientName = cleanText(patch.clientName, 100);
      if (patch.clientContact !== undefined) order.clientContact = cleanText(patch.clientContact, 120);
      if (patch.details !== undefined) order.details = cleanText(patch.details, 2000);
      if (patch.responsibleId !== undefined) order.responsibleId = patch.responsibleId ? requireMember(state, patch.responsibleId).id : null;
      if (patch.notes !== undefined) order.notes = cleanText(patch.notes, 2000);
      if (patch.deadline !== undefined) order.deadline = cleanText(patch.deadline, 30);
      if (patch.finalPrice !== undefined) order.finalPrice = finiteNonNegative(patch.finalPrice);
      if (patch.materialCost !== undefined) order.materialCost = finiteNonNegative(patch.materialCost);
      if (patch.status && orderStatuses.includes(patch.status)) order.status = patch.status;
      if (patch.materialSource && materialSources.includes(patch.materialSource)) order.materialSource = patch.materialSource;
      if (patch.materialOwnerId !== undefined) order.materialOwnerId = patch.materialOwnerId ? requireMember(state, patch.materialOwnerId).id : null;
      order.updatedAt = now;
    }

    if (action.type === "add_step") {
      const order = findOrder(state, action.orderId);
      const workType = state.workTypes.find((type) => type.id === action.workTypeId && type.active);
      if (!workType) throw new Error("Вид работы не найден.");
      const step = workStep(workType);
      step.title = cleanText(action.title, 120) || workType.name;
      order.steps.push(step);
      order.updatedAt = now;
    }

    if (action.type === "delete_step") {
      const order = findOrder(state, action.orderId);
      findStep(order, action.stepId);
      order.steps = order.steps.filter((item) => item.id !== action.stepId);
      order.updatedAt = now;
    }

    if (action.type === "add_bid") {
      const order = findOrder(state, action.orderId);
      const step = findStep(order, action.stepId);
      requireMember(state, action.memberId);
      if (order.auctionClosedAt) throw new Error("Аукцион уже закрыт администратором.");
      const amount = finiteNonNegative(action.amount);
      if (amount <= 0) throw new Error("Ставка должна быть больше нуля.");
      step.status = "bidding";
      step.bids = step.bids.filter((bid) => bid.memberId !== action.memberId);
      step.bids.push({
        id: randomUUID(),
        memberId: action.memberId,
        amount,
        comment: cleanText(action.comment, 300),
        material: cleanText(action.material, 120),
        leadTime: cleanText(action.leadTime, 80),
        createdAt: now,
      });
      order.updatedAt = now;
    }

    if (action.type === "add_question") {
      const order = findOrder(state, action.orderId);
      const message = cleanText(action.message, 500);
      if (!message) throw new Error("Напишите вопрос.");
      const member = action.memberId === "admin"
        ? { id: "admin", name: "Администратор" }
        : requireMember(state, action.memberId);
      order.questions.push({ id: randomUUID(), memberId: member.id, memberName: member.name, message, createdAt: now });
      order.updatedAt = now;
    }

    if (action.type === "close_auction") {
      const order = findOrder(state, action.orderId);
      order.auctionClosedAt = order.auctionClosedAt ? null : now;
      order.updatedAt = now;
    }

    if (action.type === "claim_step") {
      const order = findOrder(state, action.orderId);
      const step = findStep(order, action.stepId);
      requireMember(state, action.memberId);
      step.assignedTo = action.memberId;
      step.agreedAmount = step.compensationMode === "fixed" ? step.value : null;
      step.status = "assigned";
      order.status = "in_progress";
      order.updatedAt = now;
    }

    if (action.type === "select_bid") {
      const order = findOrder(state, action.orderId);
      const step = findStep(order, action.stepId);
      const bid = step.bids.find((item) => item.id === action.bidId);
      if (!bid) throw new Error("Ставка не найдена.");
      requireMember(state, bid.memberId);
      step.assignedTo = bid.memberId;
      step.agreedAmount = bid.amount;
      step.status = "assigned";
      order.status = "in_progress";
      order.updatedAt = now;
    }

    if (action.type === "update_step_status") {
      const order = findOrder(state, action.orderId);
      const step = findStep(order, action.stepId);
      if (!stepStatuses.includes(action.status)) throw new Error("Неизвестный статус работы.");
      step.status = action.status;
      step.completedAt = action.status === "done" ? now : null;
      order.updatedAt = now;
    }

    if (action.type === "add_adjustment") {
      const order = findOrder(state, action.orderId);
      requireMember(state, action.adjustment.memberId);
      const label = cleanText(action.adjustment.label, 120);
      const amount = finiteNonNegative(action.adjustment.amount);
      if (!label || amount <= 0) throw new Error("Укажите назначение и сумму корректировки.");
      order.adjustments.push({ ...action.adjustment, label, amount, id: randomUUID() });
      order.updatedAt = now;
    }

    if (action.type === "delete_adjustment") {
      const order = findOrder(state, action.orderId);
      order.adjustments = order.adjustments.filter((item) => item.id !== action.adjustmentId);
      order.updatedAt = now;
    }

    if (action.type === "add_member") {
      const name = cleanText(action.member.name, 100);
      if (!name) throw new Error("Укажите имя участника.");
      state.members.push({ id: randomUUID(), name, contact: cleanText(action.member.contact, 120), active: true });
    }

    if (action.type === "update_member") {
      const member = state.members.find((item) => item.id === action.memberId);
      if (!member) throw new Error("Участник не найден.");
      if (action.patch.name !== undefined) member.name = cleanText(action.patch.name, 100) || member.name;
      if (action.patch.contact !== undefined) member.contact = cleanText(action.patch.contact, 120);
      if (action.patch.active !== undefined) member.active = Boolean(action.patch.active);
    }

    if (action.type === "add_work_type") {
      const workType = normalizeWorkType(action.workType);
      if (!workType.name) throw new Error("Укажите название работы.");
      state.workTypes.push({ id: randomUUID(), ...workType });
    }

    if (action.type === "update_work_type") {
      const workType = state.workTypes.find((item) => item.id === action.workTypeId);
      if (!workType) throw new Error("Вид работы не найден.");
      const merged = normalizeWorkType({ ...workType, ...action.patch });
      Object.assign(workType, merged);
    }

    await persistWorkspace(state);
    return state;
  });
}

export function ensureWorkspaceMember(member: { id: string; name: string; contact?: string }) {
  return queueWorkspaceOperation(async () => {
    const state = await readWorkspace();
    const current = state.members.find((item) => item.id === member.id);
    if (current) {
      current.name = cleanText(member.name, 100) || current.name;
      current.contact = cleanText(member.contact, 120);
      current.active = true;
    } else {
      state.members.push({
        id: member.id,
        name: cleanText(member.name, 100),
        contact: cleanText(member.contact, 120),
        active: true,
      });
    }
    await persistWorkspace(state);
    return state;
  });
}
