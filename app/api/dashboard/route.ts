import type { NextRequest } from "next/server";
import { requestOriginIsAllowed } from "../../admin-auth";
import { dashboardActor } from "../../dashboard-auth";
import { getSiteRequests } from "../../request-store";
import { getTeamUsers, setTeamUserStatus, type TeamUserStatus } from "../../team-store";
import { sendNewDashboardOrderNotification } from "../../telegram-server";
import {
  applyWorkspaceAction,
  ensureWorkspaceMember,
  getWorkspaceState,
  syncSiteRequestsToWorkspace,
} from "../../workspace-store";
import type { WorkOrderStatus, WorkspaceState } from "../../workspace-types";

export const dynamic = "force-dynamic";

type DashboardAction =
  | { type: "add_bid"; orderId?: unknown; stepId?: unknown; amount?: unknown; comment?: unknown; material?: unknown; leadTime?: unknown }
  | { type: "add_question"; orderId?: unknown; message?: unknown }
  | { type: "close_auction"; orderId?: unknown }
  | { type: "select_bid"; orderId?: unknown; stepId?: unknown; bidId?: unknown }
  | { type: "update_status"; orderId?: unknown; status?: unknown }
  | { type: "update_order"; orderId?: unknown; title?: unknown; clientName?: unknown; clientContact?: unknown; details?: unknown; deadline?: unknown; finalPrice?: unknown; responsibleId?: unknown }
  | { type: "create_order"; title?: unknown; clientName?: unknown; clientContact?: unknown; details?: unknown; deadline?: unknown; responsibleId?: unknown }
  | { type: "create_idea"; title?: unknown; details?: unknown; deadline?: unknown; responsibleId?: unknown }
  | { type: "create_task"; title?: unknown; details?: unknown; deadline?: unknown; responsibleId?: unknown }
  | { type: "delete_order"; orderId?: unknown }
  | { type: "set_user_status"; userId?: unknown; status?: unknown };

const statuses: WorkOrderStatus[] = ["new", "in_progress", "agreement", "paid", "task", "idea"];
const text = (value: unknown) => String(value || "");

async function approvedResponsibleId(value: unknown) {
  const id = text(value);
  if (!id) return null;
  const user = (await getTeamUsers()).find((item) => item.id === id && item.status === "approved");
  if (!user) throw new Error("Ответственного можно выбрать только среди одобренных аккаунтов команды.");
  await ensureWorkspaceMember({ id: user.id, name: user.name });
  return user.id;
}

function sanitizedWorkspace(workspace: WorkspaceState, admin: boolean): WorkspaceState {
  if (admin) return workspace;
  return {
    ...workspace,
    members: workspace.members.filter((member) => member.active).map((member) => ({ ...member, contact: "" })),
    orders: workspace.orders.map((order) => ({ ...order, clientContact: "" })),
  };
}

async function payload(request: NextRequest) {
  const actor = await dashboardActor(request);
  if (!actor) return { error: Response.json({ message: "Войдите в кабинет команды." }, { status: 401 }) } as const;
  if (actor.status !== "approved") {
    return { error: Response.json({ actor, message: actor.status === "pending" ? "Аккаунт ожидает одобрения." : "Доступ к аккаунту отклонён." }, { status: 403 }) } as const;
  }
  await syncSiteRequestsToWorkspace(await getSiteRequests());
  const workspace = await getWorkspaceState();
  const teamUsers = await getTeamUsers();
  return {
    actor,
    workspace: sanitizedWorkspace(workspace, actor.kind === "admin"),
    assignees: teamUsers.filter((user) => user.status === "approved").map(({ id, name }) => ({ id, name })),
    users: actor.kind === "admin" ? teamUsers : undefined,
  } as const;
}

export async function GET(request: NextRequest) {
  const result = await payload(request);
  if ("error" in result) return result.error;
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return Response.json({ message: "Запрос отклонён." }, { status: 403 });
  const actor = await dashboardActor(request);
  if (!actor) return Response.json({ message: "Войдите в кабинет команды." }, { status: 401 });
  if (actor.status !== "approved") return Response.json({ message: "Аккаунт ещё не одобрен." }, { status: 403 });
  const input = await request.json().catch(() => null) as DashboardAction | null;
  if (!input?.type) return Response.json({ message: "Не указано действие." }, { status: 400 });

  try {
    if (input.type === "add_bid") {
      if (actor.kind !== "member") throw new Error("Администратор выбирает ставки, но не участвует в аукционе.");
      await applyWorkspaceAction({
        type: "add_bid", orderId: text(input.orderId), stepId: text(input.stepId), memberId: actor.id,
        amount: Number(input.amount || 0), comment: text(input.comment), material: text(input.material), leadTime: text(input.leadTime),
      });
    } else if (input.type === "add_question") {
      await applyWorkspaceAction({ type: "add_question", orderId: text(input.orderId), memberId: actor.id, message: text(input.message) });
    } else if (input.type === "create_idea" || input.type === "create_task") {
      const before = new Set((await getWorkspaceState()).orders.map((order) => order.id));
      const responsibleId = actor.kind === "admin" ? await approvedResponsibleId(input.responsibleId) : actor.id;
      const created = await applyWorkspaceAction({
        type: "create_order",
        order: { title: text(input.title), clientName: "", clientContact: "", details: text(input.details), finalPrice: 0, deadline: text(input.deadline), responsibleId },
      });
      const order = created.orders.find((item) => !before.has(item.id));
      if (order) await applyWorkspaceAction({ type: "update_order", orderId: order.id, patch: { status: input.type === "create_task" ? "task" : "idea" } });
    } else if (input.type === "update_order") {
      const workspace = await getWorkspaceState();
      const order = workspace.orders.find((item) => item.id === text(input.orderId));
      if (!order) throw new Error("Карточка не найдена.");
      let responsiblePatch: { responsibleId?: string | null } = {};
      if (input.responsibleId !== undefined) {
        const responsibleId = await approvedResponsibleId(input.responsibleId);
        if (actor.kind === "member" && responsibleId !== actor.id) {
          if (responsibleId || order.responsibleId !== actor.id) throw new Error("Можно назначить ответственным только себя.");
        }
        responsiblePatch = { responsibleId };
      }
      const patch = {
        title: text(input.title),
        details: text(input.details),
        deadline: text(input.deadline),
        ...responsiblePatch,
        ...(actor.kind === "admin" ? {
          clientName: text(input.clientName),
          clientContact: text(input.clientContact),
          finalPrice: Number(input.finalPrice || 0),
        } : {}),
      };
      await applyWorkspaceAction({ type: "update_order", orderId: order.id, patch });
    } else if (input.type === "update_status") {
      const status = text(input.status) as WorkOrderStatus;
      if (!statuses.includes(status)) throw new Error("Неизвестный статус.");
      await applyWorkspaceAction({ type: "update_order", orderId: text(input.orderId), patch: { status } });
    } else {
      if (actor.kind !== "admin") throw new Error("Это действие доступно только администратору.");
      if (input.type === "close_auction") {
        await applyWorkspaceAction({ type: "close_auction", orderId: text(input.orderId) });
      }
      if (input.type === "select_bid") {
        await applyWorkspaceAction({ type: "select_bid", orderId: text(input.orderId), stepId: text(input.stepId), bidId: text(input.bidId) });
      }
      if (input.type === "delete_order") {
        await applyWorkspaceAction({ type: "delete_order", orderId: text(input.orderId) });
      }
      if (input.type === "create_order") {
        const responsibleId = await approvedResponsibleId(input.responsibleId);
        await applyWorkspaceAction({
          type: "create_order",
          order: {
            title: text(input.title), clientName: text(input.clientName), clientContact: text(input.clientContact),
            details: text(input.details), finalPrice: 0, deadline: text(input.deadline), responsibleId,
          },
        });
        await sendNewDashboardOrderNotification().catch((error) => console.error("Manual order notification failed", error));
      }
      if (input.type === "set_user_status") {
        const status = text(input.status) as TeamUserStatus;
        if (!["approved", "rejected"].includes(status)) throw new Error("Неизвестный статус аккаунта.");
        const user = await setTeamUserStatus(text(input.userId), status);
        if (status === "approved") await ensureWorkspaceMember({ id: user.id, name: user.name });
        if (status === "rejected") {
          const workspace = await getWorkspaceState();
          if (workspace.members.some((member) => member.id === user.id)) {
            await applyWorkspaceAction({ type: "update_member", memberId: user.id, patch: { active: false } });
          }
        }
      }
    }

    const workspace = await getWorkspaceState();
    const teamUsers = await getTeamUsers();
    return Response.json({
      actor,
      workspace: sanitizedWorkspace(workspace, actor.kind === "admin"),
      assignees: teamUsers.filter((user) => user.status === "approved").map(({ id, name }) => ({ id, name })),
      users: actor.kind === "admin" ? teamUsers : undefined,
    });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Не удалось выполнить действие." }, { status: 400 });
  }
}
