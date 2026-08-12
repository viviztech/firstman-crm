import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { staffProfiles, staffServiceAssignments } from "@/db/schema/staff";
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

/**
 * Same roster as listAssignableStaff, but narrowed for a specific job card's service: an
 * operations-team executive who isn't scoped to `serviceId` is left out, since assigning them
 * would just be rejected by orders.ts's mandatory scope check (ADR 0004). Everyone else — sales/
 * no-team executives, franchise staff, managers, super_admins — stays included; the mandatory
 * scoping rule only ever applies to operations-team executives.
 */
export async function listAssignableStaffForService(serviceId: string) {
  const [staff, operationsProfiles, assignments] = await Promise.all([
    listAssignableStaff(),
    db
      .select({ userId: staffProfiles.userId })
      .from(staffProfiles)
      .where(eq(staffProfiles.team, "operations")),
    db
      .select({ userId: staffServiceAssignments.userId })
      .from(staffServiceAssignments)
      .where(eq(staffServiceAssignments.serviceId, serviceId)),
  ]);

  const operationsUserIds = new Set(operationsProfiles.map((row) => row.userId));
  const scopedForThisService = new Set(assignments.map((row) => row.userId));

  return staff.filter(
    (member) => !operationsUserIds.has(member.id) || scopedForThisService.has(member.id),
  );
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
 * employeeType/pincodes/serviceIds and ADR 0002 with team) — super_admin only.
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
      team: profile?.team ?? null,
    };
  });
}
