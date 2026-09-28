import "server-only";

import type { NextRequest } from "next/server";
import { adminCookie, verifyAdminToken } from "./admin-auth";
import { getTeamUser } from "./team-store";
import { teamCookie, verifyTeamToken } from "./team-auth";

export type DashboardActor =
  | { kind: "admin"; id: "admin"; name: "Администратор"; status: "approved" }
  | { kind: "member"; id: string; name: string; status: "pending" | "approved" | "rejected" };

export async function dashboardActor(request: NextRequest): Promise<DashboardActor | null> {
  if (verifyAdminToken(request.cookies.get(adminCookie.name)?.value)) {
    return { kind: "admin", id: "admin", name: "Администратор", status: "approved" };
  }
  const id = verifyTeamToken(request.cookies.get(teamCookie.name)?.value);
  if (!id) return null;
  const user = await getTeamUser(id);
  return user ? { kind: "member", id: user.id, name: user.name, status: user.status } : null;
}
