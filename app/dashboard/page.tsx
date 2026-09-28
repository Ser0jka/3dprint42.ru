import type { Metadata } from "next";
import DashboardClient from "../dashboard-client";

export const metadata: Metadata = {
  title: "Доска команды",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardClient />;
}
