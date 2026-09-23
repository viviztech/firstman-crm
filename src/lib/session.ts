import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Role } from "@/lib/auth";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"] & {
  role: Role;
};

export async function getCurrentSession() {
  // Employment exit revokes sessions immediately. Bypass the signed five-minute cookie cache
  // so an old cookie cannot continue authorizing CRM requests after revocation.
  return auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
}

/** Server-side defense in depth — middleware already redirects unauthenticated requests. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}
