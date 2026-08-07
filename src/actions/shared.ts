import type { ZodError } from "zod";
import type { Role } from "@/lib/auth";
import type { ActorScope } from "@/lib/scope";
import { getStaffScope } from "@/services/staff";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function toScope(user: { id: string; role: Role }): Promise<ActorScope> {
  const staffScope = await getStaffScope(user.id);
  return { userId: user.id, role: user.role, ...staffScope };
}

export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
