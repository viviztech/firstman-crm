import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";

/** Staff who can be assigned ownership of a client (super_admin/manager reassign; executives are limited to themselves). */
export async function listAssignableStaff() {
  return db
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(inArray(user.role, ["super_admin", "manager", "executive"]))
    .orderBy(asc(user.name));
}
