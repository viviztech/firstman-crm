import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import type { Role } from "@/lib/auth";
import { listStaffProfileSummaries } from "@/services/staff";

/** See catalog.ts's byNameCaseInsensitive — same cross-environment collation fix. */
const byNameCaseInsensitive = sql`lower(${user.name})`;

/** Staff who can be assigned ownership of a client (super_admin/manager reassign; executives are limited to themselves). */
export async function listAssignableStaff() {
  return db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(inArray(user.role, ["super_admin", "manager", "executive"]))
    .orderBy(byNameCaseInsensitive);
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
    .orderBy(byNameCaseInsensitive);
}

/** Recipient emails for internal digests (e.g. the daily overdue-invoices digest to accountant + manager). */
export async function listStaffEmailsByRole(roles: Role[]): Promise<string[]> {
  const rows = await db.select({ email: user.email }).from(user).where(inArray(user.role, roles));
  return rows.map((row) => row.email);
}

/**
 * Full staff roster for the admin user-management screen (spec 4.10, extended by ADR 0001 with
 * employeeType/pincodes/serviceIds) — super_admin only.
 */
export async function listAllStaffForAdmin() {
  const [rows, profileSummaries] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(byNameCaseInsensitive),
    listStaffProfileSummaries(),
  ]);

  return rows.map((row) => {
    const profile = profileSummaries.get(row.id);
    return {
      ...row,
      employeeType: profile?.employeeType ?? "internal",
      pincodes: profile?.pincodes ?? [],
      serviceIds: profile?.serviceIds ?? [],
    };
  });
}
