import type { Metadata } from "next";
import { adminIsConfigured, hasAdminSession } from "../admin-auth";
import AdminPanel from "../admin-panel";
import { getCatalogCategories, getCatalogModels } from "../catalog-store";
import { defaultSiteSettings, getSiteSettings } from "../site-settings-store";
import { getSiteRequests } from "../request-store";
import { getWorkspaceState, syncSiteRequestsToWorkspace } from "../workspace-store";

export const metadata: Metadata = {
  title: "Админка — Центр 3D-печати",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const query = await searchParams;
  const authenticated = await hasAdminSession();
  const models = authenticated ? await getCatalogModels() : [];
  const categories = authenticated ? await getCatalogCategories(models) : [];
  const settings = authenticated ? await getSiteSettings({ requestTime: false }) : defaultSiteSettings;
  const requests = authenticated ? await getSiteRequests() : [];
  if (authenticated) await syncSiteRequestsToWorkspace(requests);
  const workspace = authenticated ? await getWorkspaceState() : { version: 1 as const, members: [], workTypes: [], orders: [], dismissedRequestIds: [] };
  return (
    <AdminPanel
      authenticated={authenticated}
      configured={adminIsConfigured()}
      initialModels={models}
      initialCategories={categories}
      initialSettings={settings}
      initialRequests={requests}
      initialWorkspace={workspace}
      initialRequestsSection={query.section === "requests"}
    />
  );
}
