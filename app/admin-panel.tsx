"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { siteRoutes } from "../site-routes";
import { catalogModelFormat, type CatalogModel } from "./model-catalog-data";
import type { SiteSettings } from "./site-settings-store";
import type { SiteRequest, SiteRequestStatus } from "./request-store";
import styles from "./admin.module.css";
import AdminOrderCalculator from "./admin-order-calculator";
import AdminWorkspace from "./admin-workspace";
import type { WorkspaceState } from "./workspace-types";

type AdminSection = "overview" | "production" | "requests" | "calculator" | "catalog" | "categories" | "site";
type Status = { type: "idle" | "success" | "error"; message: string };

type AdminPanelProps = {
  authenticated: boolean;
  configured: boolean;
  initialModels: readonly CatalogModel[];
  initialCategories: readonly string[];
  initialSettings: SiteSettings;
  initialRequests: readonly SiteRequest[];
  initialWorkspace: WorkspaceState;
  initialRequestsSection?: boolean;
};

const idleStatus: Status = { type: "idle", message: "" };
const sections: { id: AdminSection; label: string }[] = [
  { id: "overview", label: "ОБЗОР" },
  { id: "production", label: "ПРОИЗВОДСТВО" },
  { id: "requests", label: "ЗАЯВКИ" },
  { id: "calculator", label: "КАЛЬКУЛЯТОР" },
  { id: "catalog", label: "КАТАЛОГ" },
  { id: "categories", label: "КАТЕГОРИИ" },
  { id: "site", label: "САЙТ" },
];

function displayName(name: string) {
  return name.charAt(0).toLocaleUpperCase("ru") + name.slice(1);
}

function requestContactHref(contact: string) {
  const phone = contact.replace(/[^+\d]/g, "");
  return phone.replace(/\D/g, "").length >= 10 ? `tel:${phone}` : "";
}

function statusFromError(error: unknown, fallback: string): Status {
  return { type: "error", message: error instanceof Error ? error.message : fallback };
}

const requestStatusLabels: Record<SiteRequestStatus, string> = {
  new: "НОВАЯ",
  in_progress: "В РАБОТЕ",
  completed: "ЗАВЕРШЕНА",
};

export default function AdminPanel({ authenticated, configured, initialModels, initialCategories, initialSettings, initialRequests, initialWorkspace, initialRequestsSection = false }: AdminPanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>(initialRequestsSection ? "requests" : "overview");
  const [models, setModels] = useState([...initialModels]);
  const [categories, setCategories] = useState([...initialCategories]);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState(initialSettings);
  const [requests, setRequests] = useState([...initialRequests]);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [editing, setEditing] = useState<CatalogModel | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(idleStatus);

  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return normalized
      ? models.filter((model) => `${model.name} ${model.category} ${model.slug}`.toLocaleLowerCase("ru").includes(normalized))
      : models;
  }, [models, query]);

  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((category) => [
    category,
    models.filter((model) => model.category === category).length,
  ])), [categories, models]);

  const refreshCatalog = async () => {
    const [modelsResponse, categoriesResponse] = await Promise.all([
      fetch("/api/admin/models", { cache: "no-store" }),
      fetch("/api/admin/categories", { cache: "no-store" }),
    ]);
    if (!modelsResponse.ok || !categoriesResponse.ok) throw new Error("Не удалось обновить каталог.");
    const modelData = await modelsResponse.json() as { models: CatalogModel[] };
    const categoryData = await categoriesResponse.json() as { categories: string[] };
    setModels(modelData.models);
    setCategories(categoryData.categories);
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus(idleStatus);
    const password = String(new FormData(event.currentTarget).get("password") || "");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось войти.");
      router.refresh();
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось войти."));
    } finally {
      setPending(false);
    }
  };

  const logout = async () => {
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
    setPending(false);
  };

  const saveModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus({ type: "idle", message: editing ? "Сохраняем изменения…" : "Загружаем модель…" });
    try {
      const response = await fetch(editing ? `/api/admin/models/${encodeURIComponent(editing.slug)}` : "/api/admin/models", { method: editing ? "PATCH" : "POST", body: new FormData(event.currentTarget) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось сохранить модель.");
      await refreshCatalog();
      formRef.current?.reset();
      setEditing(null);
      setStatus({ type: "success", message: editing ? "Модель обновлена." : "Модель добавлена в каталог." });
      router.refresh();
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось сохранить модель."));
    } finally {
      setPending(false);
    }
  };

  const editModel = (model: CatalogModel) => {
    setEditing(model);
    setActiveSection("catalog");
    setStatus(idleStatus);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    setEditing(null);
    formRef.current?.reset();
    setStatus(idleStatus);
  };

  const deleteModel = async (model: CatalogModel) => {
    if (!window.confirm(`Удалить «${displayName(model.name)}» из каталога?`)) return;
    setPending(true);
    setStatus({ type: "idle", message: "Удаляем модель…" });
    try {
      const response = await fetch(`/api/admin/models/${encodeURIComponent(model.slug)}`, { method: "DELETE" });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось удалить модель.");
      await refreshCatalog();
      if (editing?.slug === model.slug) cancelEditing();
      setStatus({ type: "success", message: "Модель удалена." });
      router.refresh();
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось удалить модель."));
    } finally {
      setPending(false);
    }
  };

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("categoryName") || "");
    setPending(true);
    setStatus({ type: "idle", message: "Добавляем категорию…" });
    try {
      const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json() as { categories?: string[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось добавить категорию.");
      setCategories(data.categories || []);
      form.reset();
      setStatus({ type: "success", message: "Категория добавлена. Теперь её можно выбрать у модели." });
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось добавить категорию."));
    } finally {
      setPending(false);
    }
  };

  const renameCategory = async (previousName: string) => {
    const nextName = categoryDrafts[previousName] ?? previousName;
    if (nextName === previousName) return;
    setPending(true);
    setStatus({ type: "idle", message: "Переименовываем категорию…" });
    try {
      const response = await fetch("/api/admin/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ previousName, nextName }) });
      const data = await response.json() as { categories?: string[]; models?: CatalogModel[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось переименовать категорию.");
      setCategories(data.categories || []);
      setModels(data.models || models);
      setCategoryDrafts({});
      setStatus({ type: "success", message: "Название обновлено у категории и всех её моделей." });
      router.refresh();
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось переименовать категорию."));
    } finally {
      setPending(false);
    }
  };

  const deleteCategory = async (name: string) => {
    if (!window.confirm(`Удалить пустую категорию «${name}»?`)) return;
    setPending(true);
    setStatus({ type: "idle", message: "Удаляем категорию…" });
    try {
      const response = await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json() as { categories?: string[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось удалить категорию.");
      setCategories(data.categories || []);
      setStatus({ type: "success", message: "Категория удалена." });
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось удалить категорию."));
    } finally {
      setPending(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus({ type: "idle", message: "Сохраняем настройки сайта…" });
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json() as { settings?: SiteSettings; message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось сохранить настройки.");
      if (data.settings) setSettings(data.settings);
      setStatus({ type: "success", message: "Настройки сохранены и уже применены на сайте." });
      router.refresh();
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось сохранить настройки."));
    } finally {
      setPending(false);
    }
  };

  const refreshRequests = async () => {
    const response = await fetch("/api/admin/requests", { cache: "no-store" });
    const data = await response.json() as { requests?: SiteRequest[]; message?: string };
    if (!response.ok) throw new Error(data.message || "Не удалось обновить заявки.");
    setRequests(data.requests || []);
  };

  const setRequestStatus = async (id: string, nextStatus: SiteRequestStatus) => {
    setPending(true);
    setStatus({ type: "idle", message: "Обновляем заявку…" });
    try {
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json() as { request?: SiteRequest; message?: string };
      if (!response.ok || !data.request) throw new Error(data.message || "Не удалось обновить заявку.");
      setRequests((current) => current.map((item) => item.id === id ? data.request as SiteRequest : item));
      setStatus({ type: "success", message: "Статус заявки обновлён." });
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось обновить заявку."));
    } finally {
      setPending(false);
    }
  };

  const removeRequest = async (request: SiteRequest) => {
    if (!window.confirm(`Удалить заявку ${request.id.slice(0, 8)} и её вложение без возможности восстановления?`)) return;
    setPending(true);
    setStatus({ type: "idle", message: "Удаляем заявку…" });
    try {
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(request.id)}`, { method: "DELETE" });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "Не удалось удалить заявку.");
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setStatus({ type: "success", message: "Заявка и вложение удалены." });
    } catch (error) {
      setStatus(statusFromError(error, "Не удалось удалить заявку."));
    } finally {
      setPending(false);
    }
  };

  if (!authenticated) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginCard}>
          <Link className={styles.logo} href={siteRoutes.home}>ЦЕНТР 3D-ПЕЧАТИ</Link>
          <span>УПРАВЛЕНИЕ САЙТОМ</span>
          <h1>Вход в админку</h1>
          <p>Заказы, распределение работы, выплаты, каталог и настройки сайта — в одной панели.</p>
          {!configured ? <div className={styles.setupNotice}>Добавьте ADMIN_PASSWORD и ADMIN_SESSION_SECRET в настройки сервера.</div> : (
            <form onSubmit={login}><label htmlFor="admin-password">Пароль</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required autoFocus /><button type="submit" disabled={pending}>{pending ? "ПРОВЕРЯЕМ…" : "ВОЙТИ"}</button></form>
          )}
          <p className={styles.status} data-state={status.type} aria-live="polite">{status.message}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.adminPage}>
      <header className={styles.adminHeader}>
        <div><Link className={styles.logo} href={siteRoutes.home}>ЦЕНТР 3D-ПЕЧАТИ</Link><span>АДМИНКА</span></div>
        <nav><Link href={siteRoutes.home} target="_blank">ОТКРЫТЬ САЙТ</Link><button type="button" onClick={logout} disabled={pending}>ВЫЙТИ</button></nav>
      </header>

      <nav className={styles.sectionNav} aria-label="Разделы админки">
        {sections.map((section) => <button type="button" data-active={activeSection === section.id} onClick={() => { setActiveSection(section.id); setStatus(idleStatus); }} key={section.id}>{section.label}</button>)}
      </nav>
      <p className={styles.globalStatus} data-state={status.type} aria-live="polite">{status.message}</p>

      {activeSection === "overview" && (
        <section className={styles.overviewSection}>
          <div className={styles.sectionHeading}><span>ПАНЕЛЬ УПРАВЛЕНИЯ</span><h1>Сайт под контролем</h1><p>Основные данные и быстрые переходы без поиска по длинной странице.</p></div>
          <div className={styles.overviewGrid}>
            <button type="button" onClick={() => setActiveSection("production")}><strong>{workspace.orders.filter((order) => !["ready", "completed"].includes(order.status)).length}</strong><span>ЗАКАЗОВ В ПРОИЗВОДСТВЕ</span><small>Доска, ставки и выплаты</small></button>
            <button type="button" onClick={() => setActiveSection("requests")}><strong>{requests.filter((request) => request.status === "new").length}</strong><span>НОВЫХ ЗАЯВОК</span><small>{requests.length} всего</small></button>
            <button type="button" onClick={() => setActiveSection("calculator")}><strong>₽</strong><span>КАЛЬКУЛЯТОР ВЫПЛАТ</span><small>Кто и сколько получает</small></button>
            <button type="button" onClick={() => setActiveSection("catalog")}><strong>{models.length}</strong><span>МОДЕЛЕЙ В КАТАЛОГЕ</span><small>Добавить STL или STEP</small></button>
            <button type="button" onClick={() => setActiveSection("categories")}><strong>{categories.length}</strong><span>КАТЕГОРИЙ</span><small>Настроить структуру каталога</small></button>
            <button type="button" onClick={() => setActiveSection("site")}><strong>01</strong><span>НАСТРОЙКИ САЙТА</span><small>Контакты и главный экран</small></button>
          </div>
          <div className={styles.overviewLinks}><Link href={siteRoutes.models} target="_blank">ПОСМОТРЕТЬ КАТАЛОГ</Link><Link href={siteRoutes.contact} target="_blank">ПРОВЕРИТЬ КОНТАКТЫ</Link></div>
        </section>
      )}

      {activeSection === "production" && <AdminWorkspace initialState={workspace} onChange={setWorkspace} />}

      {activeSection === "calculator" && <AdminOrderCalculator />}

      {activeSection === "requests" && (
        <section className={styles.requestsSection}>
          <div className={styles.requestsHeader}>
            <div className={styles.sectionHeading}><span>ОБРАЩЕНИЯ С САЙТА</span><h1>Заявки</h1><p>Контакты, файлы и протокол согласия хранятся на сервере и доступны только после входа.</p></div>
            <button type="button" onClick={() => void refreshRequests()} disabled={pending}>ОБНОВИТЬ</button>
          </div>
          <div className={styles.requestList}>
            {requests.map((request) => (
              <article className={styles.requestCard} data-status={request.status} key={request.id}>
                <header><div><span>{requestStatusLabels[request.status]} · {request.requestType === "quiz" ? "КВИЗ" : "ФОРМА"}</span><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString("ru-RU")}</time></div><strong>№ {request.id.slice(0, 8)}</strong></header>
                <div className={styles.requestMain}><div><span>КЛИЕНТ</span><h2>{request.name}</h2>{requestContactHref(request.phone) ? <a href={requestContactHref(request.phone)}>{request.phone}</a> : <p>{request.phone}</p>}</div><div><span>ЗАДАЧА</span><p>{request.details || "Описание не указано."}</p></div></div>
                <details className={styles.consentProtocol}><summary>ПРОТОКОЛ СОГЛАСИЯ</summary><dl><div><dt>Принято</dt><dd>{new Date(request.consent.acceptedAt).toLocaleString("ru-RU")}</dd></div><div><dt>Версия</dt><dd>{request.consent.version}</dd></div><div><dt>SHA-256 текста</dt><dd>{request.consent.textSha256}</dd></div><div><dt>IP</dt><dd>{request.consent.ipAddress}</dd></div><div><dt>User-Agent</dt><dd>{request.consent.userAgent || "—"}</dd></div><div><dt>Страница</dt><dd>{request.sourcePage || "—"}</dd></div><div><dt>Текст</dt><dd>{request.consent.text}</dd></div></dl></details>
                <footer><label><span>СТАТУС</span><select value={request.status} onChange={(event) => void setRequestStatus(request.id, event.target.value as SiteRequestStatus)} disabled={pending}><option value="new">Новая</option><option value="in_progress">В работе</option><option value="completed">Завершена</option></select></label>{request.attachment && <a href={`/api/admin/requests/${encodeURIComponent(request.id)}/file`}>СКАЧАТЬ · {request.attachment.originalName}</a>}<button type="button" onClick={() => void removeRequest(request)} disabled={pending}>УДАЛИТЬ</button></footer>
              </article>
            ))}
          </div>
          {requests.length === 0 && <div className={styles.emptyState}><h3>Заявок пока нет</h3><p>Новые обращения из форм и квиза появятся здесь.</p><button type="button" onClick={() => void refreshRequests()}>ОБНОВИТЬ</button></div>}
        </section>
      )}

      {activeSection === "catalog" && (
        <>
          <section className={styles.editorSection}>
            <div className={styles.editorIntro}><span>{editing ? "РЕДАКТИРОВАНИЕ" : "НОВАЯ МОДЕЛЬ"}</span><h1>{editing ? displayName(editing.name) : "Добавить 3D-файл"}</h1><p>Укажите данные, выберите готовую категорию и загрузите STL, STEP или STP. Превью можно добавить позже.</p></div>
            <form className={styles.modelForm} onSubmit={saveModel} ref={formRef} key={editing?.slug || "new"}>
              <label><span>НАЗВАНИЕ *</span><input name="name" defaultValue={editing?.name} required minLength={2} maxLength={100} /></label>
              <label><span>АДРЕС СТРАНИЦЫ</span><input name="slug" defaultValue={editing?.slug} placeholder="Создастся из названия" maxLength={100} /></label>
              <label><span>КАТЕГОРИЯ *</span><select name="category" defaultValue={editing?.category || categories[0]} required>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
              <label><span>ЦЕНА ОТ, ₽ *</span><input name="price" type="number" defaultValue={editing?.price ?? 500} min={0} max={10000000} step={1} required /></label>
              <label className={styles.wide}><span>МАТЕРИАЛ *</span><input name="material" defaultValue={editing?.material || "PLA / PETG / нейлон"} required maxLength={120} /></label>
              <label className={styles.wide}><span>ОПИСАНИЕ *</span><textarea name="description" defaultValue={editing?.description} required minLength={10} maxLength={600} rows={4} /></label>
              <label className={styles.fileField}><span>STL, STEP ИЛИ STP {editing ? "— ПУСТОЕ ПОЛЕ СОХРАНИТ ТЕКУЩИЙ" : "*"}</span><input name="model" type="file" accept=".stl,.step,.stp,model/stl,model/step,application/step" required={!editing} /></label>
              <label className={styles.fileField}><span>ПРЕВЬЮ — PNG, JPG ИЛИ WEBP</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp" /></label>
              <div className={styles.formActions}><button className={styles.saveButton} type="submit" disabled={pending || categories.length === 0}>{pending ? "СОХРАНЯЕМ…" : editing ? "СОХРАНИТЬ" : "ДОБАВИТЬ В КАТАЛОГ"}</button>{editing && <button className={styles.cancelButton} type="button" onClick={cancelEditing}>ОТМЕНИТЬ</button>}{categories.length === 0 && <button className={styles.cancelButton} type="button" onClick={() => setActiveSection("categories")}>СНАЧАЛА ДОБАВИТЬ КАТЕГОРИЮ</button>}</div>
            </form>
          </section>

          <section className={styles.librarySection}>
            <div className={styles.libraryHeader}><div><span>КАТАЛОГ</span><h2>{models.length} моделей</h2></div><label><span>ПОИСК</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или категория" /></label></div>
            <div className={styles.adminGrid}>{filteredModels.map((model) => (
              <article className={styles.adminCard} key={model.slug}><div className={styles.adminPreview}>{model.image ? <Image src={model.image} alt={`Превью модели ${displayName(model.name)}`} fill unoptimized={model.image.startsWith("/catalog-files/")} sizes="220px" /> : <b>3D</b>}</div><div className={styles.adminCardBody}><span>{model.category} · {catalogModelFormat(model)}</span><h3>{displayName(model.name)}</h3><p>{model.price.toLocaleString("ru-RU")} ₽ · {model.material}</p><div><button type="button" onClick={() => editModel(model)} disabled={pending}>ИЗМЕНИТЬ</button><button type="button" onClick={() => deleteModel(model)} disabled={pending}>УДАЛИТЬ</button></div></div></article>
            ))}</div>
            {filteredModels.length === 0 && <div className={styles.emptyState}><h3>Ничего не найдено</h3><p>Проверьте запрос или очистите поиск.</p><button type="button" onClick={() => setQuery("")}>ОЧИСТИТЬ ПОИСК</button></div>}
          </section>
        </>
      )}

      {activeSection === "categories" && (
        <section className={styles.managementSection}>
          <div className={styles.sectionHeading}><span>СТРУКТУРА КАТАЛОГА</span><h1>Категории</h1><p>Новая категория сразу появится в форме модели. При переименовании обновятся все связанные карточки.</p></div>
          <form className={styles.addCategoryForm} onSubmit={addCategory}><label><span>НОВАЯ КАТЕГОРИЯ</span><input name="categoryName" placeholder="Например, Автокомпоненты" required minLength={2} maxLength={80} /></label><button type="submit" disabled={pending}>ДОБАВИТЬ</button></form>
          <div className={styles.categoryList}>{categories.map((category, index) => (
            <div className={styles.categoryRow} key={category}><span>{String(index + 1).padStart(2, "0")}</span><label><span>НАЗВАНИЕ</span><input value={categoryDrafts[category] ?? category} onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category]: event.target.value }))} /></label><strong>{categoryCounts[category] || 0} моделей</strong><div><button type="button" onClick={() => renameCategory(category)} disabled={pending || (categoryDrafts[category] ?? category) === category}>СОХРАНИТЬ</button><button type="button" onClick={() => deleteCategory(category)} disabled={pending}>УДАЛИТЬ</button></div></div>
          ))}</div>
        </section>
      )}

      {activeSection === "site" && (
        <section className={styles.managementSection}>
          <div className={styles.sectionHeading}><span>ОСНОВНЫЕ ДАННЫЕ</span><h1>Настройки сайта</h1><p>Меняйте главный экран и контакты. После сохранения данные обновятся на всех страницах.</p></div>
          <form className={styles.settingsForm} onSubmit={saveSettings}>
            <fieldset><legend>ГЛАВНЫЙ ЭКРАН</legend><label><span>МЕТКА НАД ЗАГОЛОВКОМ</span><input value={settings.hero.eyebrow} onChange={(event) => setSettings((current) => ({ ...current, hero: { ...current.hero, eyebrow: event.target.value } }))} required /></label><div className={styles.formPair}><label><span>ПЕРВАЯ СТРОКА H1</span><input value={settings.hero.titleLineOne} onChange={(event) => setSettings((current) => ({ ...current, hero: { ...current.hero, titleLineOne: event.target.value } }))} required /></label><label><span>ВТОРАЯ СТРОКА H1</span><input value={settings.hero.titleLineTwo} onChange={(event) => setSettings((current) => ({ ...current, hero: { ...current.hero, titleLineTwo: event.target.value } }))} required /></label></div><label><span>ОПИСАНИЕ</span><textarea value={settings.hero.description} onChange={(event) => setSettings((current) => ({ ...current, hero: { ...current.hero, description: event.target.value } }))} rows={4} required /></label></fieldset>
            <fieldset><legend>КОНТАКТЫ</legend><div className={styles.formPair}><label><span>ТЕЛЕФОН</span><input value={settings.contact.phoneDisplay} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, phoneDisplay: event.target.value } }))} required /></label><label><span>АДРЕС</span><input value={settings.contact.address} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, address: event.target.value } }))} required /></label></div><label><span>ССЫЛКА НА 2ГИС</span><input type="url" value={settings.contact.map} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, map: event.target.value } }))} required /></label><div className={styles.formPair}><label><span>TELEGRAM — ПОДПИСЬ</span><input value={settings.contact.telegramDisplay} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, telegramDisplay: event.target.value } }))} required /></label><label><span>TELEGRAM — ССЫЛКА</span><input type="url" value={settings.contact.telegram} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, telegram: event.target.value } }))} required /></label></div><div className={styles.formPair}><label><span>ВКОНТАКТЕ</span><input type="url" value={settings.contact.vk} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, vk: event.target.value } }))} required /></label><label><span>MAX</span><input type="url" value={settings.contact.max} onChange={(event) => setSettings((current) => ({ ...current, contact: { ...current.contact, max: event.target.value } }))} required /></label></div></fieldset>
            <div className={styles.settingsActions}><button className={styles.saveButton} type="submit" disabled={pending}>{pending ? "СОХРАНЯЕМ…" : "СОХРАНИТЬ НАСТРОЙКИ"}</button><Link href={siteRoutes.home} target="_blank">ОТКРЫТЬ САЙТ</Link></div>
          </form>
        </section>
      )}
    </main>
  );
}
