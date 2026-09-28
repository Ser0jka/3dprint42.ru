"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./admin-workspace.module.css";
import {
  calculateOrderPayouts,
  stepPayout,
  type CompensationMode,
  type MaterialSource,
  type TeamMember,
  type WorkOrder,
  type WorkOrderStatus,
  type WorkspaceAction,
  type WorkspaceState,
  type WorkType,
} from "./workspace-types";

type WorkspaceView = "board" | "settings";
type Feedback = { kind: "idle" | "success" | "error"; message: string };

const statusLabels: Record<WorkOrderStatus, string> = {
  new: "НОВЫЕ",
  in_progress: "В РАБОТЕ",
  agreement: "СОГЛАСОВАНИЕ",
  paid: "ОПЛАЧЕНО",
  task: "ЗАДАЧИ",
  idea: "ИДЕИ",
};

const statusHints: Record<WorkOrderStatus, string> = {
  new: "Нужно оценить и разложить на работы",
  in_progress: "Назначенные работы выполняются",
  agreement: "Результат или образцы у клиента",
  paid: "Закрытые и оплаченные заказы",
  task: "Внутренние задачи команды",
  idea: "Внутренние планы и эксперименты",
};

const modeLabels: Record<CompensationMode, string> = {
  percent: "% ОТ ЗАКАЗА",
  fixed: "ФИКСИРОВАННО",
  bid: "СТАВКА ИСПОЛНИТЕЛЯ",
};

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

function memberName(members: readonly TeamMember[], memberId: string | null) {
  return members.find((member) => member.id === memberId)?.name || "Не назначен";
}

function workTypeName(workTypes: readonly WorkType[], typeId: string) {
  return workTypes.find((type) => type.id === typeId)?.name || "Работа";
}

export default function AdminWorkspace({ initialState, onChange }: { initialState: WorkspaceState; onChange?: (workspace: WorkspaceState) => void }) {
  const [workspace, setWorkspace] = useState(initialState);
  const [view, setView] = useState<WorkspaceView>("board");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [selectedOrderId, setSelectedOrderId] = useState(initialState.orders[0]?.id || "");
  const [currentMemberId, setCurrentMemberId] = useState(initialState.members.find((member) => member.active)?.id || "");

  useEffect(() => {
    if (currentMemberId) window.localStorage.setItem("3dprint42-current-member", currentMemberId);
  }, [currentMemberId]);

  const selectedOrder = workspace.orders.find((order) => order.id === selectedOrderId) || null;
  const activeMembers = workspace.members.filter((member) => member.active);
  const boardStats = useMemo(() => {
    const activeOrders = workspace.orders.filter((order) => !["paid", "idea"].includes(order.status)).length;
    const openSteps = workspace.orders.flatMap((order) => order.steps).filter((step) => !step.assignedTo && step.status !== "done").length;
    const assignedTotal = workspace.orders.reduce((sum, order) => sum + calculateOrderPayouts(order).reduce((inner, payout) => inner + payout.total, 0), 0);
    return { activeOrders, openSteps, assignedTotal };
  }, [workspace.orders]);

  async function mutate(action: WorkspaceAction, success: string) {
    setPending(true);
    setFeedback({ kind: "idle", message: "Сохраняем изменения…" });
    try {
      const response = await fetch("/api/admin/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await response.json() as { workspace?: WorkspaceState; message?: string };
      if (!response.ok || !data.workspace) throw new Error(data.message || "Не удалось сохранить изменения.");
      setWorkspace(data.workspace);
      onChange?.(data.workspace);
      setFeedback({ kind: "success", message: success });
      return true;
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Не удалось сохранить изменения." });
      return false;
    } finally {
      setPending(false);
    }
  }

  async function refresh() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/workspace", { cache: "no-store" });
      const data = await response.json() as { workspace?: WorkspaceState; message?: string };
      if (!response.ok || !data.workspace) throw new Error(data.message || "Не удалось обновить доску.");
      setWorkspace(data.workspace);
      onChange?.(data.workspace);
      setFeedback({ kind: "success", message: "Доска обновлена." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Не удалось обновить доску." });
    } finally {
      setPending(false);
    }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const previousIds = new Set(workspace.orders.map((order) => order.id));
    const success = await mutate({
      type: "create_order",
      order: {
        title: String(values.get("title") || ""),
        clientName: String(values.get("clientName") || ""),
        clientContact: String(values.get("clientContact") || ""),
        details: String(values.get("details") || ""),
        finalPrice: Number(values.get("finalPrice") || 0),
        deadline: String(values.get("deadline") || ""),
      },
    }, "Заказ добавлен на доску.");
    if (success) {
      form.reset();
      setWorkspace((current) => {
        const created = current.orders.find((order) => !previousIds.has(order.id));
        if (created) setSelectedOrderId(created.id);
        return current;
      });
    }
  }

  async function saveOrder(event: FormEvent<HTMLFormElement>, order: WorkOrder) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await mutate({
      type: "update_order",
      orderId: order.id,
      patch: {
        title: String(values.get("title") || ""),
        clientName: String(values.get("clientName") || ""),
        clientContact: String(values.get("clientContact") || ""),
        details: String(values.get("details") || ""),
        finalPrice: Number(values.get("finalPrice") || 0),
        materialSource: String(values.get("materialSource") || "office") as MaterialSource,
        materialOwnerId: String(values.get("materialOwnerId") || "") || null,
        materialCost: Number(values.get("materialCost") || 0),
        deadline: String(values.get("deadline") || ""),
        notes: String(values.get("notes") || ""),
      },
    }, "Данные заказа сохранены.");
  }

  async function addStep(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await mutate({
      type: "add_step",
      orderId,
      workTypeId: String(values.get("workTypeId") || ""),
      title: String(values.get("title") || ""),
    }, "Работа добавлена в заказ.");
    if (success) form.reset();
  }

  async function addBid(event: FormEvent<HTMLFormElement>, orderId: string, stepId: string) {
    event.preventDefault();
    if (!currentMemberId) {
      setFeedback({ kind: "error", message: "Сначала выберите, от чьего имени работаете." });
      return;
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await mutate({
      type: "add_bid",
      orderId,
      stepId,
      memberId: currentMemberId,
      amount: Number(values.get("amount") || 0),
      comment: String(values.get("comment") || ""),
      material: String(values.get("material") || ""),
      leadTime: String(values.get("leadTime") || ""),
    }, "Ставка добавлена. Администратор может её принять.");
    if (success) form.reset();
  }

  async function addAdjustment(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await mutate({
      type: "add_adjustment",
      orderId,
      adjustment: {
        memberId: String(values.get("memberId") || ""),
        label: String(values.get("label") || ""),
        amount: Number(values.get("amount") || 0),
        kind: String(values.get("kind") || "bonus") as "bonus" | "expense" | "deduction",
      },
    }, "Корректировка добавлена в расчёт.");
    if (success) form.reset();
  }

  async function removeOrder(order: WorkOrder) {
    const sourceNote = order.requestId ? " Исходная заявка и протокол согласия останутся в разделе «Заявки»." : "";
    if (!window.confirm(`Удалить заказ «${order.title}» со всеми работами и расчётами?${sourceNote}`)) return;
    const nextOrder = workspace.orders.find((item) => item.id !== order.id);
    const success = await mutate({ type: "delete_order", orderId: order.id }, "Заказ удалён с производственной доски.");
    if (success) setSelectedOrderId(nextOrder?.id || "");
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span>СОВМЕСТНОЕ ПРОИЗВОДСТВО</span>
          <h1>Заказы и работа команды</h1>
          <p>Заявка разбивается на конкретные работы. Исполнитель забирает работу или предлагает цену, а итоговая выплата считается автоматически.</p>
        </div>
        <div className={styles.identity}>
          <label htmlFor="workspace-member">РАБОТАЮ КАК</label>
          <select id="workspace-member" value={currentMemberId} onChange={(event) => setCurrentMemberId(event.target.value)}>
            <option value="">Выберите участника</option>
            {activeMembers.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}
          </select>
        </div>
      </header>

      <div className={styles.stats}>
        <div><strong>{boardStats.activeOrders}</strong><span>АКТИВНЫХ ЗАКАЗОВ</span></div>
        <div><strong>{boardStats.openSteps}</strong><span>СВОБОДНЫХ РАБОТ</span></div>
        <div><strong>{money(boardStats.assignedTotal)}</strong><span>РАСПРЕДЕЛЕНО</span></div>
      </div>

      <div className={styles.toolbar}>
        <div role="tablist" aria-label="Раздел производства">
          <button type="button" role="tab" aria-selected={view === "board"} data-active={view === "board"} onClick={() => setView("board")}>ДОСКА</button>
          <button type="button" role="tab" aria-selected={view === "settings"} data-active={view === "settings"} onClick={() => setView("settings")}>КОМАНДА И ПРАВИЛА</button>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={pending}>ОБНОВИТЬ</button>
      </div>
      <p className={styles.feedback} data-kind={feedback.kind} aria-live="polite">{feedback.message}</p>

      {view === "board" ? (
        <>
          <div className={styles.board}>
            {(Object.keys(statusLabels) as WorkOrderStatus[]).map((status) => {
              const orders = workspace.orders.filter((order) => order.status === status);
              return (
                <section className={styles.column} key={status}>
                  <header><div><span>{statusLabels[status]}</span><small>{statusHints[status]}</small></div><strong>{orders.length}</strong></header>
                  <div className={styles.cards}>
                    {orders.map((order) => {
                      const done = order.steps.filter((step) => step.status === "done").length;
                      return (
                        <button className={styles.orderCard} data-selected={selectedOrderId === order.id} type="button" onClick={() => setSelectedOrderId(order.id)} key={order.id}>
                          <span>№ {order.id.slice(0, 6)}{order.requestId ? " · С САЙТА" : " · ВРУЧНУЮ"}</span>
                          <strong>{order.title}</strong>
                          <p>{order.clientName || order.clientContact || "Клиент не указан"}</p>
                          <div><b>{money(order.finalPrice)}</b><small>{done}/{order.steps.length} работ</small></div>
                        </button>
                      );
                    })}
                    {orders.length === 0 && <p className={styles.emptyColumn}>Пока пусто</p>}
                  </div>
                </section>
              );
            })}
          </div>

          <details className={styles.createPanel}>
            <summary>+ ДОБАВИТЬ ЗАКАЗ ВРУЧНУЮ</summary>
            <form onSubmit={createOrder}>
              <label><span>НАЗВАНИЕ *</span><input name="title" required placeholder="Например, втулки для Саратова" /></label>
              <label><span>КЛИЕНТ</span><input name="clientName" /></label>
              <label><span>КОНТАКТ</span><input name="clientContact" /></label>
              <label><span>ЦЕНА ДЛЯ КЛИЕНТА, ₽</span><input name="finalPrice" type="number" min="0" step="1" /></label>
              <label><span>СРОК</span><input name="deadline" type="date" /></label>
              <label className={styles.wide}><span>ЧТО НУЖНО СДЕЛАТЬ</span><textarea name="details" rows={3} /></label>
              <button type="submit" disabled={pending}>ДОБАВИТЬ НА ДОСКУ</button>
            </form>
          </details>

          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              members={workspace.members}
              workTypes={workspace.workTypes}
              currentMemberId={currentMemberId}
              pending={pending}
              mutate={mutate}
              saveOrder={saveOrder}
              addStep={addStep}
              addBid={addBid}
              addAdjustment={addAdjustment}
              removeOrder={removeOrder}
            />
          ) : (
            <div className={styles.emptySelection}><h2>Выберите заказ</h2><p>Здесь появятся состав работ, ставки исполнителей и итоговый расчёт.</p></div>
          )}
        </>
      ) : (
        <WorkspaceSettings workspace={workspace} pending={pending} mutate={mutate} />
      )}
    </section>
  );
}

type Mutate = (action: WorkspaceAction, success: string) => Promise<boolean>;

function OrderDetails({
  order, members, workTypes, currentMemberId, pending, mutate, saveOrder, addStep, addBid, addAdjustment, removeOrder,
}: {
  order: WorkOrder;
  members: TeamMember[];
  workTypes: WorkType[];
  currentMemberId: string;
  pending: boolean;
  mutate: Mutate;
  saveOrder: (event: FormEvent<HTMLFormElement>, order: WorkOrder) => Promise<void>;
  addStep: (event: FormEvent<HTMLFormElement>, orderId: string) => Promise<void>;
  addBid: (event: FormEvent<HTMLFormElement>, orderId: string, stepId: string) => Promise<void>;
  addAdjustment: (event: FormEvent<HTMLFormElement>, orderId: string) => Promise<void>;
  removeOrder: (order: WorkOrder) => Promise<void>;
}) {
  const payouts = calculateOrderPayouts(order);
  const totalPayout = payouts.reduce((sum, payout) => sum + payout.total, 0);
  const reserve = order.finalPrice - totalPayout;

  return (
    <section className={styles.orderDetails} aria-label={`Заказ ${order.title}`}>
      <header className={styles.orderTitle}>
        <div><span>ЗАКАЗ № {order.id.slice(0, 8)}</span><h2>{order.title}</h2></div>
        <div className={styles.orderTitleActions}>
          <label><span>ЭТАП</span><select value={order.status} onChange={(event) => void mutate({ type: "update_order", orderId: order.id, patch: { status: event.target.value as WorkOrderStatus } }, "Заказ перемещён на следующий этап.")} disabled={pending}>{(Object.keys(statusLabels) as WorkOrderStatus[]).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
          <button className={styles.dangerButton} type="button" onClick={() => void removeOrder(order)} disabled={pending}>УДАЛИТЬ ЗАКАЗ</button>
        </div>
      </header>

      <form className={styles.orderForm} onSubmit={(event) => void saveOrder(event, order)} key={`${order.id}-${order.updatedAt}`}>
        <label><span>НАЗВАНИЕ</span><input name="title" defaultValue={order.title} required /></label>
        <label><span>КЛИЕНТ</span><input name="clientName" defaultValue={order.clientName} /></label>
        <label><span>КОНТАКТ</span><input name="clientContact" defaultValue={order.clientContact} /></label>
        <label><span>ИТОГОВАЯ ЦЕНА, ₽</span><input name="finalPrice" type="number" min="0" defaultValue={order.finalPrice} /></label>
        <label><span>СРОК</span><input name="deadline" type="date" defaultValue={order.deadline} /></label>
        <label><span>МАТЕРИАЛ</span><select name="materialSource" defaultValue={order.materialSource}><option value="office">С офиса</option><option value="contractor">Свой у исполнителя</option><option value="client">Материал клиента</option></select></label>
        <label><span>ЧЕЙ МАТЕРИАЛ</span><select name="materialOwnerId" defaultValue={order.materialOwnerId || ""}><option value="">Не выбран</option>{members.filter((member) => member.active).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
        <label><span>ВОЗМЕЩЕНИЕ МАТЕРИАЛА, ₽</span><input name="materialCost" type="number" min="0" defaultValue={order.materialCost} /></label>
        <label className={styles.wide}><span>ОПИСАНИЕ</span><textarea name="details" rows={3} defaultValue={order.details} /></label>
        <label className={styles.wide}><span>ЗАМЕТКИ КОМАНДЫ</span><textarea name="notes" rows={3} defaultValue={order.notes} /></label>
        <button type="submit" disabled={pending}>СОХРАНИТЬ ЗАКАЗ</button>
      </form>

      <div className={styles.workHeader}><div><span>РАЗДЕЛЕНИЕ РАБОТ</span><h3>Кто что делает</h3></div><p>Процент считается от итоговой цены. Ставка фиксируется после выбора предложения.</p></div>
      <form className={styles.addStep} onSubmit={(event) => void addStep(event, order.id)}>
        <label><span>ВИД РАБОТЫ</span><select name="workTypeId" required defaultValue=""><option value="" disabled>Выберите работу</option>{workTypes.filter((type) => type.active).map((type) => <option value={type.id} key={type.id}>{type.name} · {modeLabels[type.compensationMode]}</option>)}</select></label>
        <label><span>УТОЧНЕНИЕ</span><input name="title" placeholder="Необязательно" /></label>
        <button type="submit" disabled={pending}>ДОБАВИТЬ РАБОТУ</button>
      </form>

      <div className={styles.stepList}>
        {order.steps.map((step, index) => (
          <article className={styles.stepCard} data-done={step.status === "done"} key={step.id}>
            <header>
              <span>{String(index + 1).padStart(2, "0")} · {workTypeName(workTypes, step.typeId)}</span>
              <div className={styles.stepState}><b>{step.status === "done" ? "ГОТОВО" : step.assignedTo ? "НАЗНАЧЕНО" : step.status === "bidding" ? "СБОР СТАВОК" : "СВОБОДНО"}</b><button type="button" aria-label={`Удалить работу ${step.title}`} onClick={() => { if (window.confirm(`Удалить работу «${step.title}» вместе со ставками?`)) void mutate({ type: "delete_step", orderId: order.id, stepId: step.id }, "Работа удалена из заказа."); }} disabled={pending}>УДАЛИТЬ</button></div>
            </header>
            <div className={styles.stepMain}>
              <div><h4>{step.title}</h4><p>{step.assignedTo ? memberName(members, step.assignedTo) : "Исполнитель пока не выбран"}</p></div>
              <strong>{step.compensationMode === "percent" ? `${step.value}% · ${money(stepPayout(order, step))}` : step.agreedAmount !== null ? money(step.agreedAmount) : step.compensationMode === "fixed" ? money(step.value) : "ПО СТАВКЕ"}</strong>
            </div>
            {!step.assignedTo && step.compensationMode !== "bid" && currentMemberId && <button className={styles.claimButton} type="button" onClick={() => void mutate({ type: "claim_step", orderId: order.id, stepId: step.id, memberId: currentMemberId }, "Работа закреплена за вами.")} disabled={pending}>ЗАБРАТЬ РАБОТУ</button>}
            {!step.assignedTo && (
              <form className={styles.bidForm} onSubmit={(event) => void addBid(event, order.id, step.id)}>
                <label><span>МОЯ ЦЕНА, ₽</span><input name="amount" type="number" min="1" required /></label>
                <label><span>КОММЕНТАРИЙ</span><input name="comment" placeholder="Срок, условия" /></label>
                <button type="submit" disabled={pending || !currentMemberId}>ПРЕДЛОЖИТЬ</button>
              </form>
            )}
            {step.bids.length > 0 && !step.assignedTo && <div className={styles.bidList}>{step.bids.map((bid) => <div key={bid.id}><span><b>{memberName(members, bid.memberId)}</b>{bid.comment && <small>{bid.comment}</small>}</span><strong>{money(bid.amount)}</strong><button type="button" onClick={() => void mutate({ type: "select_bid", orderId: order.id, stepId: step.id, bidId: bid.id }, "Ставка принята, работа назначена.")} disabled={pending}>НАЗНАЧИТЬ</button></div>)}</div>}
            {step.assignedTo && <div className={styles.stepActions}><button type="button" onClick={() => void mutate({ type: "update_step_status", orderId: order.id, stepId: step.id, status: step.status === "done" ? "assigned" : "done" }, step.status === "done" ? "Работа снова открыта." : "Работа отмечена выполненной.")} disabled={pending}>{step.status === "done" ? "ВЕРНУТЬ В РАБОТУ" : "ОТМЕТИТЬ ГОТОВОЙ"}</button></div>}
          </article>
        ))}
        {order.steps.length === 0 && <p className={styles.emptyColumn}>Добавьте хотя бы одну работу.</p>}
      </div>

      <div className={styles.financeGrid}>
        <section className={styles.adjustments}>
          <div><span>ДОПОЛНИТЕЛЬНЫЙ УЧЁТ</span><h3>Расходы и доплаты</h3></div>
          <form onSubmit={(event) => void addAdjustment(event, order.id)}>
            <label><span>УЧАСТНИК</span><select name="memberId" required defaultValue=""><option value="" disabled>Выберите</option>{members.filter((member) => member.active).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
            <label><span>ТИП</span><select name="kind"><option value="expense">Расход / возмещение</option><option value="bonus">Доплата</option><option value="deduction">Удержание</option></select></label>
            <label><span>ЗА ЧТО</span><input name="label" required /></label>
            <label><span>СУММА, ₽</span><input name="amount" type="number" min="1" required /></label>
            <button type="submit" disabled={pending}>ДОБАВИТЬ</button>
          </form>
          {order.adjustments.map((item) => <div className={styles.adjustmentRow} key={item.id}><span><b>{memberName(members, item.memberId)}</b><small>{item.label}</small></span><strong>{item.kind === "deduction" ? "−" : "+"}{money(item.amount)}</strong><button type="button" aria-label={`Удалить корректировку ${item.label}`} onClick={() => void mutate({ type: "delete_adjustment", orderId: order.id, adjustmentId: item.id }, "Корректировка удалена.")}>×</button></div>)}
        </section>

        <section className={styles.payouts}>
          <div><span>ИТОГ ЗАКАЗА</span><h3>Распределение денег</h3></div>
          {payouts.map((payout) => <div className={styles.payoutRow} key={payout.memberId}><span><b>{memberName(members, payout.memberId)}</b><small>работа {money(payout.work)} · материал {money(payout.materials)} · прочее {money(payout.adjustments)}</small></span><strong>{money(payout.total)}</strong></div>)}
          {payouts.length === 0 && <p>Назначьте работы, чтобы увидеть выплаты.</p>}
          <div className={styles.reserve} data-negative={reserve < 0}><span><b>{reserve < 0 ? "ПЕРЕРАСХОД" : "ОСТАЁТСЯ В ЗАКАЗЕ"}</b><small>Цена клиента минус все выплаты и расходы</small></span><strong>{money(reserve)}</strong></div>
        </section>
      </div>
    </section>
  );
}

function WorkspaceSettings({ workspace, pending, mutate }: { workspace: WorkspaceState; pending: boolean; mutate: Mutate }) {
  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await mutate({ type: "add_member", member: { name: String(values.get("name") || ""), contact: String(values.get("contact") || "") } }, "Участник добавлен в команду.");
    if (success) form.reset();
  }

  async function saveMember(event: FormEvent<HTMLFormElement>, member: TeamMember) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await mutate({ type: "update_member", memberId: member.id, patch: { name: String(values.get("name") || ""), contact: String(values.get("contact") || ""), active: values.get("active") === "on" } }, "Данные участника сохранены.");
  }

  async function addWorkType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await mutate({ type: "add_work_type", workType: { name: String(values.get("name") || ""), compensationMode: String(values.get("compensationMode") || "fixed") as CompensationMode, defaultValue: Number(values.get("defaultValue") || 0), autoAddToNewOrder: values.get("autoAddToNewOrder") === "on", reimbursesMaterials: values.get("reimbursesMaterials") === "on", active: true } }, "Новый вид работы добавлен.");
    if (success) form.reset();
  }

  async function saveWorkType(event: FormEvent<HTMLFormElement>, workType: WorkType) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await mutate({ type: "update_work_type", workTypeId: workType.id, patch: { name: String(values.get("name") || ""), compensationMode: String(values.get("compensationMode") || "fixed") as CompensationMode, defaultValue: Number(values.get("defaultValue") || 0), autoAddToNewOrder: values.get("autoAddToNewOrder") === "on", reimbursesMaterials: values.get("reimbursesMaterials") === "on", active: values.get("active") === "on" } }, "Правило оплаты сохранено.");
  }

  return (
    <div className={styles.settingsGrid}>
      <section className={styles.settingsBlock}>
        <header><span>КОМАНДА</span><h2>Кто может брать работу</h2><p>Выключенный участник останется в старых расчётах, но не сможет брать новые задачи.</p></header>
        <form className={styles.quickAdd} onSubmit={addMember}><label><span>ИМЯ</span><input name="name" required /></label><label><span>КОНТАКТ</span><input name="contact" placeholder="Telegram или телефон" /></label><button type="submit" disabled={pending}>ДОБАВИТЬ</button></form>
        <div className={styles.ruleList}>{workspace.members.map((member) => <form onSubmit={(event) => void saveMember(event, member)} key={member.id}><label><span>ИМЯ</span><input name="name" defaultValue={member.name} required /></label><label><span>КОНТАКТ</span><input name="contact" defaultValue={member.contact} /></label><label className={styles.check}><input name="active" type="checkbox" defaultChecked={member.active} /><span>АКТИВЕН</span></label><button type="submit" disabled={pending}>СОХРАНИТЬ</button></form>)}</div>
      </section>

      <section className={styles.settingsBlock}>
        <header><span>ПРАВИЛА ОПЛАТЫ</span><h2>Работы и проценты</h2><p>Автоматические работы добавляются к каждой новой заявке. Остальные можно подключить вручную в заказе.</p></header>
        <form className={styles.typeAdd} onSubmit={addWorkType}><label><span>РАБОТА</span><input name="name" required /></label><label><span>ОПЛАТА</span><select name="compensationMode"><option value="percent">Процент</option><option value="fixed">Фикс</option><option value="bid">Ставка</option></select></label><label><span>ЗНАЧЕНИЕ</span><input name="defaultValue" type="number" min="0" defaultValue="0" /></label><label className={styles.check}><input name="autoAddToNewOrder" type="checkbox" /><span>ДОБАВЛЯТЬ В НОВЫЕ</span></label><label className={styles.check}><input name="reimbursesMaterials" type="checkbox" /><span>УЧИТЫВАТЬ МАТЕРИАЛ</span></label><button type="submit" disabled={pending}>ДОБАВИТЬ</button></form>
        <div className={styles.ruleList}>{workspace.workTypes.map((workType) => <form onSubmit={(event) => void saveWorkType(event, workType)} key={workType.id}><label><span>РАБОТА</span><input name="name" defaultValue={workType.name} required /></label><label><span>ОПЛАТА</span><select name="compensationMode" defaultValue={workType.compensationMode}><option value="percent">Процент</option><option value="fixed">Фикс</option><option value="bid">Ставка</option></select></label><label><span>{workType.compensationMode === "percent" ? "ПРОЦЕНТ" : "СУММА"}</span><input name="defaultValue" type="number" min="0" defaultValue={workType.defaultValue} /></label><label className={styles.check}><input name="autoAddToNewOrder" type="checkbox" defaultChecked={workType.autoAddToNewOrder} /><span>В НОВЫЕ</span></label><label className={styles.check}><input name="reimbursesMaterials" type="checkbox" defaultChecked={workType.reimbursesMaterials} /><span>МАТЕРИАЛ</span></label><label className={styles.check}><input name="active" type="checkbox" defaultChecked={workType.active} /><span>АКТИВНА</span></label><button type="submit" disabled={pending}>СОХРАНИТЬ</button></form>)}</div>
      </section>
    </div>
  );
}
