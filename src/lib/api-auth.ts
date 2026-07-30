import { headers } from "next/headers";
import { auth, type Role } from "@/lib/auth";

export type ApiUser = { id: string; role: Role; name: string };

/** Session check for Route Handlers — requireUser()/requireRole() call redirect(), which isn't valid here. */
export async function getApiUser(): Promise<ApiUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session.user as ApiUser;
}
