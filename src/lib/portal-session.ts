import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/services/portal-auth";

/** Distinct from better-auth's own session cookie (ADR 0009 decision 2/4) — clients aren't in the `user` table. */
export const PORTAL_SESSION_COOKIE = "fm_portal_session";
export const PORTAL_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type PortalClient = { clientId: string };

export async function getCurrentPortalClient(): Promise<PortalClient | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!rawSession) return null;

  const session = await getPortalSession(rawSession);
  return session ? { clientId: session.clientId } : null;
}

/** Portal equivalent of requireUser() — redirects to the portal's own login, not staff /login. */
export async function requirePortalClient(): Promise<PortalClient> {
  const client = await getCurrentPortalClient();
  if (!client) {
    redirect("/portal/login");
  }
  return client;
}
