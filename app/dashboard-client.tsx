"use client";

import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import type { WorkOrder, WorkOrderStatus, WorkspaceState } from "./workspace-types";

type Actor = { kind: "admin" | "member"; id: string; name: string; status: "pending" | "approved" | "rejected" };
type TeamUser = { id: string; name: string; login: string; status: Actor["status"]; createdAt: string; approvedAt: string | null };
type Assignee = { id: string; name: string };
type DashboardPayload = { actor: Actor; workspace: WorkspaceState; assignees: Assignee[]; users?: TeamUser[] };
type Notice = { kind: "idle" | "success" | "error"; text: string };
type DashboardSection = "orders" | "production" | "tasks" | "ideas" | "team";

const statusLabels: Record<WorkOrderStatus, string> = {
  new: "Новые",
  in_progress: "В работе",
  agreement: "Согласование",
  paid: "Оплачено",
  task: "Задачи",
  idea: "Идеи",
};

const statusNotes: Record<WorkOrderStatus, string> = {
  new: "Открытый аукцион",
  in_progress: "Назначены исполнители",
  agreement: "Ждём решение клиента",
  paid: "Закрытые заказы",
  task: "Текущие дела команды",
  idea: "Планы команды",
};

const sectionMeta: Record<DashboardSection, { eyebrow: string; title: string; search: string; statuses: WorkOrderStatus[] }> = {
  orders: { eyebrow: "CRM / ЗАЯВКИ", title: "Заявки и согласования", search: "Найти заявку, клиента или номер", statuses: ["new", "agreement", "paid"] },
  production: { eyebrow: "CRM / ПРОИЗВОДСТВО", title: "Заказы в работе", search: "Найти заказ или клиента", statuses: ["in_progress"] },
  tasks: { eyebrow: "CRM / ЗАДАЧИ", title: "Задачи команды", search: "Найти задачу", statuses: ["task"] },
  ideas: { eyebrow: "CRM / ИДЕИ", title: "Идеи и планы", search: "Найти идею", statuses: ["idea"] },
  team: { eyebrow: "CRM / КОМАНДА", title: "Участники и доступы", search: "", statuses: [] },
};

const fullBoardStatuses: WorkOrderStatus[] = ["new", "in_progress", "agreement", "paid", "task", "idea"];

const money = (amount: number) => `${Math.round(amount).toLocaleString("ru-RU")} ₽`;
const dateTime = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function memberName(workspace: WorkspaceState, id: string) {
  return workspace.members.find((member) => member.id === id)?.name || "Участник";
}

function responsibleName(data: DashboardPayload, id: string | null) {
  if (!id) return "Не назначен";
  return data.assignees.find((member) => member.id === id)?.name || memberName(data.workspace, id);
}

function AuctionClock({ createdAt, closedAt }: { createdAt: string; closedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (closedAt) return <span className={styles.closed}>АУКЦИОН ЗАКРЫТ</span>;
  const remaining = new Date(createdAt).getTime() + 15 * 60_000 - now;
  if (remaining <= 0) return <span className={styles.overdue}>15 МИНУТ ПРОШЛО</span>;
  return <span className={styles.clock}>ЕЩЁ ≈ {Math.ceil(remaining / 60_000)} МИН</span>;
}

export default function DashboardClient() {
  const [session, setSession] = useState<Actor | null | undefined>(undefined);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: "idle", text: "" });
  const [activeSection, setActiveSection] = useState<DashboardSection>("orders");
  const [search, setSearch] = useState("");
  const [boardFilter, setBoardFilter] = useState<"all" | "mine" | "attention">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [draggedId, setDraggedId] = useState("");
  const [dropStatus, setDropStatus] = useState<WorkOrderStatus | null>(null);
  const [filterNow, setFilterNow] = useState(() => Date.now());
  const [mobileWorkspace, setMobileWorkspace] = useState(false);

  const load = useCallback(async () => {
    const sessionResponse = await fetch("/api/dashboard/auth/session", { cache: "no-store" });
    const sessionData = await sessionResponse.json() as { actor: Actor | null };
    setSession(sessionData.actor);
    if (!sessionData.actor || sessionData.actor.status !== "approved") {
      setData(null);
      return;
    }
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const payload = await response.json() as DashboardPayload & { message?: string };
    if (!response.ok) throw new Error(payload.message || "Не удалось открыть доску.");
    setData(payload);
    setSelectedId((current) => current && payload.workspace.orders.some((order) => order.id === current) ? current : "");
  }, []);

  useEffect(() => {
    // Initial data comes from the authenticated API after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => setNotice({ kind: "error", text: error instanceof Error ? error.message : "Ошибка загрузки." }));
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setFilterNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const updateLayout = () => setMobileWorkspace(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);

  async function auth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(`/api/dashboard/auth/${authMode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Операция не выполнена.");
      setNotice({ kind: "success", text: result.message || "Готово." });
      if (authMode === "login") await load();
      else { form.reset(); setAuthMode("login"); }
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Операция не выполнена." });
    } finally { setPending(false); }
  }

  async function mutate(action: Record<string, unknown>, success: string) {
    setPending(true);
    try {
      const response = await fetch("/api/dashboard", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
      });
      const result = await response.json() as DashboardPayload & { message?: string };
      if (!response.ok) throw new Error(result.message || "Не удалось сохранить изменения.");
      setData(result);
      setNotice({ kind: "success", text: success });
      return true;
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Не удалось сохранить изменения." });
      return false;
    } finally { setPending(false); }
  }

  async function logout() {
    await fetch("/api/dashboard/auth/logout", { method: "POST" });
    setSession(null); setData(null); setNotice({ kind: "idle", text: "" });
  }

  const activeStatuses = mobileWorkspace ? sectionMeta[activeSection].statuses : fullBoardStatuses;
  const sectionOrders = useMemo(() => {
    const statuses = new Set(activeStatuses);
    return (data?.workspace.orders || []).filter((order) => statuses.has(order.status));
  }, [activeStatuses, data]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    const actorId = data?.actor.id;
    return sectionOrders.filter((order) => {
      const matchesSearch = !query || [order.title, order.clientName, order.details, order.id]
        .some((value) => value.toLocaleLowerCase("ru-RU").includes(query));
      if (!matchesSearch) return false;
      if (boardFilter === "mine") {
        return order.responsibleId === actorId || order.steps.some((step) => step.assignedTo === actorId || step.bids.some((bid) => bid.memberId === actorId));
      }
      if (boardFilter === "attention") {
        const deadlinePassed = Boolean(order.deadline) && new Date(`${order.deadline}T23:59:59`).getTime() < filterNow;
        const auctionPassed = order.status === "new" && !order.auctionClosedAt && new Date(order.createdAt).getTime() + 15 * 60_000 < filterNow;
        return order.status !== "paid" && (deadlinePassed || auctionPassed);
      }
      return true;
    });
  }, [boardFilter, data?.actor.id, filterNow, search, sectionOrders]);

  function openSection(section: DashboardSection) {
    setActiveSection(section);
    setSelectedId("");
    setSearch("");
    setBoardFilter("all");
  }

  function beginDrag(event: DragEvent<HTMLButtonElement>, orderId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", orderId);
    setDraggedId(orderId);
  }

  function finishDrag() {
    setDraggedId("");
    setDropStatus(null);
  }

  function moveCard(event: DragEvent<HTMLElement>, status: WorkOrderStatus) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData("text/plain") || draggedId;
    finishDrag();
    if (!orderId || !data) return;
    const order = data.workspace.orders.find((item) => item.id === orderId);
    if (!order || order.status === status) return;
    void mutate({ type: "update_status", orderId, status }, `Заявка перемещена в «${statusLabels[status]}».`);
  }

  if (session === undefined) return <main className={styles.loading}>ОТКРЫВАЕМ ДОСКУ…</main>;
  if (!session) return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={auth} pending={pending} notice={notice} />;
  if (session.status !== "approved") {
    return (
      <main className={styles.waiting}>
        <div><span>ЦЕНТР 3D-ПЕЧАТИ / КОМАНДА</span><h1>{session.status === "pending" ? "Доступ ожидает одобрения" : "Доступ отклонён"}</h1><p>Администратор должен подтвердить аккаунт. После подтверждения войдите снова.</p><button type="button" onClick={() => void logout()}>ВЫЙТИ</button></div>
      </main>
    );
  }
  if (!data) return <main className={styles.loading}>ЗАГРУЖАЕМ ЗАЯВКИ…</main>;

  const selected = data.workspace.orders.find((order) => order.id === selectedId) || null;
  const pendingUsers = data.users?.filter((user) => user.status === "pending") || [];
  const newCount = data.workspace.orders.filter((order) => order.status === "new").length;
  const inProgressCount = data.workspace.orders.filter((order) => order.status === "in_progress").length;
  const taskCount = data.workspace.orders.filter((order) => order.status === "task").length;
  const ideaCount = data.workspace.orders.filter((order) => order.status === "idea").length;
  const sectionSum = sectionOrders.reduce((sum, order) => sum + order.finalPrice, 0);
  const unassignedCount = sectionOrders.filter((order) => !order.responsibleId).length;
  const deadlinesCount = sectionOrders.filter((order) => Boolean(order.deadline)).length;
  return (
    <main className={styles.crmShell}>
      <aside className={styles.sidebar} aria-label="Основная навигация">
        <div className={styles.brandMark}><span>ЦЕНТР</span><strong>3D</strong></div>
        <nav>
          <button type="button" data-active={activeSection === "orders"} aria-current={activeSection === "orders" ? "page" : undefined} aria-label="Заявки" onClick={() => openSection("orders")}><UiIcon name="board" /><span>Заявки</span><b>{newCount || ""}</b></button>
          <button type="button" data-active={activeSection === "production"} aria-current={activeSection === "production" ? "page" : undefined} aria-label="Производство" onClick={() => openSection("production")}><UiIcon name="work" /><span>Производство</span><b>{inProgressCount || ""}</b></button>
          <button type="button" data-active={activeSection === "tasks"} aria-current={activeSection === "tasks" ? "page" : undefined} aria-label="Задачи" onClick={() => openSection("tasks")}><UiIcon name="task" /><span>Задачи</span><b>{taskCount || ""}</b></button>
          <button type="button" data-active={activeSection === "ideas"} aria-current={activeSection === "ideas" ? "page" : undefined} aria-label="Идеи" onClick={() => openSection("ideas")}><UiIcon name="bulb" /><span>Идеи</span><b>{ideaCount || ""}</b></button>
          {data.actor.kind === "admin" && <button type="button" data-active={activeSection === "team"} aria-current={activeSection === "team" ? "page" : undefined} aria-label="Команда" onClick={() => openSection("team")}><UiIcon name="users" /><span>Команда</span><b>{pendingUsers.length || ""}</b></button>}
        </nav>
        <button className={styles.sidebarExit} type="button" onClick={() => void logout()} aria-label="Выйти"><UiIcon name="logout" /><span>Выйти</span></button>
      </aside>

      <section className={styles.crmMain}>
        <header className={styles.crmTopbar} data-compact={activeSection === "team"}>
          <div className={styles.pageIdentity}><span>{sectionMeta[activeSection].eyebrow}</span><h1>{sectionMeta[activeSection].title}</h1></div>
          {activeSection !== "team" && <label className={styles.globalSearch}><UiIcon name="search" /><span className={styles.srOnly}>Поиск в разделе</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={sectionMeta[activeSection].search} /></label>}
          <div className={styles.userMenu}>
            <button type="button" className={styles.iconButton} onClick={() => void load()} disabled={pending} aria-label="Обновить"><UiIcon name="refresh" /></button>
            <button type="button" className={`${styles.iconButton} ${styles.mobileLogout}`} onClick={() => void logout()} aria-label="Выйти"><UiIcon name="logout" /></button>
            <span className={styles.avatar}>{data.actor.name.slice(0, 1).toLocaleUpperCase("ru-RU")}</span>
            <span><strong>{data.actor.name}</strong><small>{data.actor.kind === "admin" ? "Администратор" : "Исполнитель"}</small></span>
          </div>
        </header>

        {activeSection !== "team" && <div className={styles.crmToolbar}>
          <div className={styles.viewTabs} role="tablist" aria-label="Вид заявок">
            <button type="button" role="tab" aria-selected={viewMode === "kanban"} data-active={viewMode === "kanban"} onClick={() => setViewMode("kanban")}><UiIcon name="board" />КАНБАН</button>
            <button type="button" role="tab" aria-selected={viewMode === "list"} data-active={viewMode === "list"} onClick={() => setViewMode("list")}><UiIcon name="list" />СПИСОК</button>
          </div>
          <div className={styles.filterPills} aria-label="Фильтры">
            <button type="button" data-active={boardFilter === "all"} onClick={() => setBoardFilter("all")}>Все <b>{sectionOrders.length}</b></button>
            <button type="button" data-active={boardFilter === "mine"} onClick={() => setBoardFilter("mine")}>Мои</button>
            <button type="button" data-active={boardFilter === "attention"} onClick={() => setBoardFilter("attention")}>Требуют внимания</button>
          </div>
          <div className={styles.quickActions}>
            {activeSection === "orders" && data.actor.kind === "admin" && <CreatePanel kind="order" pending={pending} onCreate={mutate} assignees={data.assignees} canAssign />}
            {activeSection === "tasks" && <CreatePanel kind="task" pending={pending} onCreate={mutate} assignees={data.assignees} canAssign={data.actor.kind === "admin"} />}
            {activeSection === "ideas" && <CreatePanel kind="idea" pending={pending} onCreate={mutate} assignees={data.assignees} canAssign={data.actor.kind === "admin"} />}
          </div>
        </div>}

        {activeSection !== "team" && <div className={styles.metricsStrip}>
          <div><span>КАРТОЧЕК</span><strong>{sectionOrders.length}</strong></div>
          <div><span>БЕЗ ОТВЕТСТВЕННОГО</span><strong>{unassignedCount}</strong></div>
          <div><span>СО СРОКОМ</span><strong>{deadlinesCount}</strong></div>
          <div><span>СУММА</span><strong>{money(sectionSum)}</strong></div>
        </div>}

        <p className={styles.notice} data-kind={notice.kind} aria-live="polite">{notice.text}</p>

        {activeSection === "team" ? (
          <TeamView users={data.users || []} pending={pending} mutate={mutate} />
        ) : viewMode === "kanban" ? (
          <section className={styles.boardViewport} aria-label="Канбан заявок">
            <div className={styles.board} data-columns={activeStatuses.length}>
              {activeStatuses.map((status) => {
                const orders = visibleOrders.filter((order) => order.status === status);
                const total = orders.reduce((sum, order) => sum + order.finalPrice, 0);
                return (
                  <section
                    className={styles.column}
                    data-status={status}
                    data-drop={dropStatus === status}
                    key={status}
                    onDragEnter={(event) => { event.preventDefault(); setDropStatus(status); }}
                    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                    onDrop={(event) => moveCard(event, status)}
                  >
                    <header><div><strong>{statusLabels[status]}</strong><span>{statusNotes[status]}</span></div><b>{orders.length}</b></header>
                    <div className={styles.columnTotal}>{total ? money(total) : "—"}</div>
                    <div className={styles.cardList}>
                      {orders.map((order) => {
                        const bids = order.steps.reduce((sum, step) => sum + step.bids.length, 0);
                        const assigned = order.steps.map((step) => step.assignedTo).filter(Boolean) as string[];
                        return (
                          <button
                            type="button"
                            className={styles.card}
                            draggable
                            data-selected={selectedId === order.id}
                            data-dragging={draggedId === order.id}
                            onDragStart={(event) => beginDrag(event, order.id)}
                            onDragEnd={finishDrag}
                            onClick={() => setSelectedId(order.id)}
                            key={order.id}
                          >
                            <span className={styles.cardTop}><i><UiIcon name="grip" /></i><em>{order.requestId ? "С САЙТА" : status === "idea" ? "ИДЕЯ" : status === "task" ? "ЗАДАЧА" : "ВРУЧНУЮ"}</em><small>#{order.id.slice(0, 6)}</small></span>
                            <strong>{order.title}</strong>
                            <p>{order.clientName || (["idea", "task"].includes(status) ? "Внутренняя карточка" : "Имя не указано")}</p>
                            <div className={styles.cardMeta}><span>{order.deadline ? `до ${order.deadline}` : dateTime(order.createdAt)}</span>{order.finalPrice > 0 && <b>{money(order.finalPrice)}</b>}</div>
                            <div className={styles.cardFooter}><span><UiIcon name="comment" />{order.questions.length}</span><span><UiIcon name="bid" />{bids}</span><span className={styles.cardOwner} data-empty={!order.responsibleId}><UiIcon name="user" />{responsibleName(data, order.responsibleId)}</span><span className={styles.assignees}>{assigned.slice(0, 3).map((id) => <i key={id} title={memberName(data.workspace, id)}>{memberName(data.workspace, id).slice(0, 1)}</i>)}</span>{status === "new" && <AuctionClock createdAt={order.createdAt} closedAt={order.auctionClosedAt} />}</div>
                          </button>
                        );
                      })}
                      {!orders.length && <p className={styles.empty}>{draggedId ? "Перетащите сюда" : "В этой стадии пока пусто"}</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <section className={styles.listView} aria-label="Список заявок">
            <header><span>ЗАЯВКА</span><span>КЛИЕНТ</span><span>СТАДИЯ</span><span>ОТВЕТСТВЕННЫЙ</span><span>СРОК</span><span>СУММА</span><span>АКТИВНОСТЬ</span></header>
            {visibleOrders.map((order) => <button type="button" onClick={() => setSelectedId(order.id)} key={order.id}><span><b>{order.title}</b><small>#{order.id.slice(0, 8)}</small></span><span>{order.clientName || "—"}</span><span><i data-status={order.status}>{statusLabels[order.status]}</i></span><span>{responsibleName(data, order.responsibleId)}</span><span>{order.deadline || "Не указан"}</span><span>{order.finalPrice ? money(order.finalPrice) : "—"}</span><span>{dateTime(order.updatedAt)}</span></button>)}
            {!visibleOrders.length && <p className={styles.empty}>По этому фильтру заявок нет.</p>}
          </section>
        )}
      </section>

      {selected && <><button type="button" className={styles.drawerBackdrop} aria-label="Закрыть карточку" onClick={() => setSelectedId("")} /><OrderPanel key={selected.id} order={selected} data={data} pending={pending} mutate={mutate} onClose={() => setSelectedId("")} /></>}
    </main>
  );
}

function AuthScreen({ mode, setMode, onSubmit, pending, notice }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; notice: Notice }) {
  return (
    <main className={styles.authPage}>
      <section className={styles.authIntro}><span>ЦЕНТР 3D-ПЕЧАТИ / КОМАНДА</span><h1>Заявки, ставки и производство</h1><p>Закрытая доска команды. Новые аккаунты открываются после подтверждения администратора.</p></section>
      <section className={styles.authCard}>
        <div className={styles.authTabs}><button type="button" data-active={mode === "login"} onClick={() => setMode("login")}>ВОЙТИ</button><button type="button" data-active={mode === "register"} onClick={() => setMode("register")}>РЕГИСТРАЦИЯ</button></div>
        <form onSubmit={onSubmit}>
          {mode === "register" && <label><span>ИМЯ</span><input name="name" required autoComplete="name" /></label>}
          <label><span>ЛОГИН</span><input name="login" required autoComplete="username" /></label>
          <label><span>ПАРОЛЬ</span><input name="password" type="password" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          <button type="submit" disabled={pending}>{mode === "login" ? "ОТКРЫТЬ ДОСКУ" : "ОТПРАВИТЬ НА ОДОБРЕНИЕ"}</button>
        </form>
        <p className={styles.notice} data-kind={notice.kind}>{notice.text}</p>
      </section>
    </main>
  );
}

function CreatePanel({ kind, pending, onCreate, assignees, canAssign }: { kind: "order" | "task" | "idea"; pending: boolean; onCreate: (action: Record<string, unknown>, success: string) => Promise<boolean>; assignees: Assignee[]; canAssign: boolean }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const actionType = kind === "order" ? "create_order" : kind === "task" ? "create_task" : "create_idea";
    const successText = kind === "order" ? "Заявка добавлена в «Новые»." : kind === "task" ? "Задача добавлена." : "Идея добавлена.";
    const success = await onCreate({ type: actionType, ...values }, successText);
    if (success) { form.reset(); form.closest("details")?.removeAttribute("open"); }
  }
  const title = kind === "order" ? "+ ЗАЯВКА ПО ЗВОНКУ" : kind === "task" ? "+ ДОБАВИТЬ ЗАДАЧУ" : "+ ДОБАВИТЬ ИДЕЮ";
  return (
    <details className={styles.actionPanel}>
      <summary>{title}</summary>
      <form onSubmit={submit}>
        <label><span>НАЗВАНИЕ *</span><input name="title" required /></label>
        {kind === "order" && <><label><span>ИМЯ КЛИЕНТА</span><input name="clientName" /></label><label><span>ТЕЛЕФОН</span><input name="clientContact" /></label></>}
        <label><span>СРОК</span><input name="deadline" type="date" /></label>
        {canAssign && <label><span>ОТВЕТСТВЕННЫЙ</span><select name="responsibleId" disabled={!assignees.length}><option value="">Не назначен</option>{assignees.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select>{!assignees.length && <small>Появится после одобрения аккаунтов команды</small>}</label>}
        <label className={styles.full}><span>{kind === "idea" ? "ОПИСАНИЕ ИДЕИ" : kind === "task" ? "ЧТО НУЖНО СДЕЛАТЬ" : "ОПИСАНИЕ"}</span><textarea name="details" rows={kind === "order" ? 4 : 9} /></label>
        <button type="submit" disabled={pending}>ДОБАВИТЬ</button>
      </form>
    </details>
  );
}

function TeamView({ users, pending, mutate }: { users: TeamUser[]; pending: boolean; mutate: (action: Record<string, unknown>, success: string) => Promise<boolean> }) {
  const statusName: Record<TeamUser["status"], string> = { pending: "Ждёт одобрения", approved: "Доступ открыт", rejected: "Доступ отклонён" };
  return (
    <section className={styles.teamView} aria-label="Управление командой">
      <header><div><span>АККАУНТЫ КОМАНДЫ</span><h2>Доступ к рабочей доске</h2></div><p>Новые участники регистрируются сами. До одобрения они не видят заявки и файлы.</p></header>
      <div className={styles.teamGrid}>
        {users.map((user) => <article className={styles.teamCard} key={user.id} data-status={user.status}>
          <span className={styles.teamAvatar}>{user.name.slice(0, 1).toLocaleUpperCase("ru-RU")}</span>
          <div><strong>{user.name}</strong><small>@{user.login}</small></div>
          <span className={styles.teamStatus}>{statusName[user.status]}</span>
          <small>Регистрация: {dateTime(user.createdAt)}</small>
          {user.status === "pending" && <div className={styles.teamActions}><button type="button" disabled={pending} onClick={() => void mutate({ type: "set_user_status", userId: user.id, status: "approved" }, `${user.name}: доступ открыт.`)}>ОДОБРИТЬ</button><button type="button" disabled={pending} onClick={() => void mutate({ type: "set_user_status", userId: user.id, status: "rejected" }, `${user.name}: доступ отклонён.`)}>ОТКЛОНИТЬ</button></div>}
        </article>)}
        {!users.length && <div className={styles.teamEmpty}><UiIcon name="users" /><strong>Здесь появится команда</strong><p>Пока никто не зарегистрировался. После регистрации аккаунт появится здесь на одобрение.</p></div>}
      </div>
    </section>
  );
}

function OrderPanel({ order, data, pending, mutate, onClose }: { order: WorkOrder; data: DashboardPayload; pending: boolean; mutate: (action: Record<string, unknown>, success: string) => Promise<boolean>; onClose: () => void }) {
  const isAdmin = data.actor.kind === "admin";
  const [editing, setEditing] = useState(false);
  const isInternal = order.status === "idea" || order.status === "task";
  const relevantSteps = order.steps.filter((step) => ["modeling", "printing", "resin-printing"].includes(step.typeId));
  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    if (await mutate({ type: "add_question", orderId: order.id, message: values.get("message") }, "Вопрос добавлен.")) form.reset();
  }
  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (await mutate({ type: "update_order", orderId: order.id, ...values }, "Карточка обновлена.")) setEditing(false);
  }
  return (
    <aside className={styles.detail} aria-label={`Карточка заявки ${order.title}`}>
      <button type="button" className={styles.drawerClose} onClick={onClose} aria-label="Закрыть карточку"><UiIcon name="close" /></button>
      <header className={styles.detailHeader}>
        <div><span>{order.status === "idea" ? "ИДЕЯ" : order.status === "task" ? "ЗАДАЧА" : "ЗАЯВКА"} № {order.id.slice(0, 8)}</span><h2>{order.title}</h2>{!isInternal && <p>{order.clientName || "Имя не указано"}{isAdmin && order.clientContact ? ` · ${order.clientContact}` : ""}</p>}</div>
        <div className={styles.detailControls}>
          {order.status === "new" && <AuctionClock createdAt={order.createdAt} closedAt={order.auctionClosedAt} />}
          <button type="button" className={styles.editButton} disabled={pending} onClick={() => setEditing((value) => !value)}><UiIcon name="edit" />{editing ? "ОТМЕНИТЬ" : "РЕДАКТИРОВАТЬ"}</button>
          <select aria-label="Статус заявки" value={order.status} disabled={pending} onChange={(event) => void mutate({ type: "update_status", orderId: order.id, status: event.target.value }, "Заявка перемещена.")}>{(Object.keys(statusLabels) as WorkOrderStatus[]).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select>
          {isAdmin && order.status === "new" && <button type="button" disabled={pending} onClick={() => void mutate({ type: "close_auction", orderId: order.id }, order.auctionClosedAt ? "Аукцион снова открыт." : "Аукцион закрыт.")}>{order.auctionClosedAt ? "ОТКРЫТЬ АУКЦИОН" : "ЗАКРЫТЬ АУКЦИОН"}</button>}
          {isAdmin && <button type="button" className={styles.delete} disabled={pending} onClick={() => window.confirm("Удалить заявку?") && void mutate({ type: "delete_order", orderId: order.id }, "Заявка удалена.")}>УДАЛИТЬ</button>}
        </div>
      </header>
      {editing ? (
        <form className={styles.editForm} data-internal={isInternal} onSubmit={saveOrder}>
          <label className={styles.full}><span>НАЗВАНИЕ *</span><input name="title" required defaultValue={order.title} /></label>
          {!isInternal && isAdmin && <><label><span>ИМЯ КЛИЕНТА</span><input name="clientName" defaultValue={order.clientName} /></label><label><span>ТЕЛЕФОН</span><input name="clientContact" defaultValue={order.clientContact} /></label><label><span>СТОИМОСТЬ, ₽</span><input name="finalPrice" type="number" min="0" defaultValue={order.finalPrice || ""} /></label></>}
          <label><span>СРОК</span><input name="deadline" type="date" defaultValue={order.deadline} /></label>
          {isAdmin && <label><span>ОТВЕТСТВЕННЫЙ</span><select name="responsibleId" defaultValue={order.responsibleId || ""} disabled={!data.assignees.length}><option value="">Не назначен</option>{data.assignees.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select>{!data.assignees.length && <small>Появится после одобрения аккаунтов команды</small>}</label>}
          <label className={`${styles.full} ${styles.descriptionField}`}><span>{order.status === "idea" ? "ПОДРОБНОЕ ОПИСАНИЕ ИДЕИ" : order.status === "task" ? "ОПИСАНИЕ ЗАДАЧИ" : "ОПИСАНИЕ"}</span><textarea name="details" rows={isInternal ? 14 : 8} defaultValue={order.details} /></label>
          <div className={styles.editActions}><button type="button" onClick={() => setEditing(false)} disabled={pending}>ОТМЕНА</button><button type="submit" disabled={pending}>{pending ? "СОХРАНЯЕМ…" : "СОХРАНИТЬ"}</button></div>
        </form>
      ) : (
        <div className={styles.brief} data-internal={isInternal}>
          <div><span>{order.status === "idea" ? "ОПИСАНИЕ ИДЕИ" : order.status === "task" ? "ОПИСАНИЕ ЗАДАЧИ" : "ОПИСАНИЕ"}</span><p>{order.details || "Описание пока не добавлено."}</p></div>
          <div><span>СРОК</span><p>{order.deadline || "Не установлен"}</p></div>
          <div className={styles.responsibleBrief}><span>ОТВЕТСТВЕННЫЙ</span><p>{responsibleName(data, order.responsibleId)}</p>{data.actor.kind === "member" && (!order.responsibleId || order.responsibleId === data.actor.id) && <button type="button" disabled={pending} onClick={() => void mutate({ type: "update_order", orderId: order.id, title: order.title, details: order.details, deadline: order.deadline, responsibleId: order.responsibleId ? "" : data.actor.id }, order.responsibleId ? "Ответственный снят." : "Карточка назначена вам.")}>{order.responsibleId ? "СНЯТЬ СЕБЯ" : "ВЗЯТЬ СЕБЕ"}</button>}</div>
          {!isInternal && order.finalPrice > 0 && <div><span>СТОИМОСТЬ</span><p>{money(order.finalPrice)}</p></div>}
          {order.requestId && <a href={`/api/dashboard/orders/${order.id}/attachment`} target="_blank" rel="noreferrer">ОТКРЫТЬ ФАЙЛ ЗАЯВКИ ↗</a>}
        </div>
      )}
      {!isInternal && <div className={styles.auctionGrid}>{relevantSteps.map((step) => <BidSection key={step.id} order={order} step={step} data={data} pending={pending} mutate={mutate} />)}</div>}
      <section className={styles.questions}>
        <header><span>ОБЩЕЕ ОБСУЖДЕНИЕ</span><strong>{order.questions.length}</strong></header>
        <div>{order.questions.map((question) => <p key={question.id}><span><b>{question.memberName}</b><small>{dateTime(question.createdAt)}</small></span>{question.message}</p>)}{!order.questions.length && <p className={styles.muted}>Вопросов пока нет.</p>}</div>
        <form onSubmit={addQuestion}><label><span>ВОПРОС ИЛИ УТОЧНЕНИЕ</span><input name="message" required placeholder="Например: какая нагрузка будет на деталь?" /></label><button type="submit" disabled={pending}>ДОБАВИТЬ</button></form>
      </section>
    </aside>
  );
}

function BidSection({ order, step, data, pending, mutate }: { order: WorkOrder; step: WorkOrder["steps"][number]; data: DashboardPayload; pending: boolean; mutate: (action: Record<string, unknown>, success: string) => Promise<boolean> }) {
  const isAdmin = data.actor.kind === "admin";
  const ownBid = step.bids.find((bid) => bid.memberId === data.actor.id);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    if (await mutate({ type: "add_bid", orderId: order.id, stepId: step.id, ...values }, "Предложение сохранено.")) form.reset();
  }
  return (
    <section className={styles.bidSection}>
      <header><div><span>{step.typeId === "modeling" ? "МОДЕЛИРОВАНИЕ" : "ПЕЧАТЬ"}</span><h3>{step.title}</h3></div><strong>{step.bids.length}</strong></header>
      <div className={styles.bidList}>{step.bids.map((bid) => <article key={bid.id} data-selected={step.assignedTo === bid.memberId}><div><b>{memberName(data.workspace, bid.memberId)}</b><strong>{money(bid.amount)}</strong></div>{bid.material && <p>Материал: {bid.material}</p>}{bid.leadTime && <p>Срок: {bid.leadTime}</p>}{bid.comment && <p>{bid.comment}</p>}{isAdmin && step.assignedTo !== bid.memberId && <button type="button" disabled={pending} onClick={() => void mutate({ type: "select_bid", orderId: order.id, stepId: step.id, bidId: bid.id }, "Исполнитель выбран.")}>ВЫБРАТЬ</button>}</article>)}</div>
      {!isAdmin && order.status === "new" && !order.auctionClosedAt && <form className={styles.bidForm} onSubmit={submit}>
        <label><span>ВАША ЦЕНА, ₽</span><input name="amount" type="number" min="1" required defaultValue={ownBid?.amount || ""} /></label>
        {step.typeId !== "modeling" && <label><span>МАТЕРИАЛ</span><input name="material" placeholder="PETG, свой / офис" defaultValue={ownBid?.material || ""} /></label>}
        <label><span>СРОК</span><input name="leadTime" placeholder="Например, 2 дня" defaultValue={ownBid?.leadTime || ""} /></label>
        <label className={styles.full}><span>КОММЕНТАРИЙ</span><input name="comment" defaultValue={ownBid?.comment || ""} /></label>
        <button type="submit" disabled={pending}>{ownBid ? "ОБНОВИТЬ" : "ПРЕДЛОЖИТЬ"}</button>
      </form>}
    </section>
  );
}

function UiIcon({ name }: { name: "board" | "list" | "search" | "refresh" | "users" | "user" | "work" | "task" | "bulb" | "logout" | "grip" | "comment" | "bid" | "close" | "edit" }) {
  const paths: Record<typeof name, React.ReactNode> = {
    board: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M19 12a8 8 0 1 0-2.3 5.7" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M3 12h18M9 12v2h6v-2" /></>,
    task: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 2 2 4-4M8 16h8" /></>,
    bulb: <><path d="M9 18h6M10 22h4" /><path d="M8.5 14.5A7 7 0 1 1 15.5 14.5C14.5 15.3 14 16 14 18h-4c0-2-.5-2.7-1.5-3.5Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    grip: <><circle cx="8" cy="7" r="1" /><circle cx="16" cy="7" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="8" cy="17" r="1" /><circle cx="16" cy="17" r="1" /></>,
    comment: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    bid: <><path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
