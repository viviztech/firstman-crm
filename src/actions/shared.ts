import type { ZodError } from "zod";
import type { Role } from "@/lib/auth";
import type { ActorScope } from "@/lib/scope";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export function toScope(user: { id: string; role: Role }): ActorScope {
  return { userId: user.id, role: user.role };
}

export function firstIssueMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
