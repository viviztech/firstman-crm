import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import type { Role } from "@/lib/auth";

/** Staff who can be assigned ownership of a client (super_admin/manager reassign; executives are limited to themselves). */
export async function listAssignableStaff() {
  return db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(inArray(user.role, ["super_admin", "manager", "executive"]))
    .orderBy(asc(user.name));
}

/** Unscoped fetch for notification jobs — system-context, not a user request (mirrors getInvoiceForPdf). */
export async function getUserContact(userId: string) {
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0];
}

/** Every executive — for iterating the morning follow-up digest cron across all of them. */
export async function listExecutives() {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.role, "executive"))
    .orderBy(asc(user.name));
}

/** Recipient emails for internal digests (e.g. the daily overdue-invoices digest to accountant + manager). */
export async function listStaffEmailsByRole(roles: Role[]): Promise<string[]> {
  const rows = await db.select({ email: user.email }).from(user).where(inArray(user.role, roles));
  return rows.map((row) => row.email);
}
