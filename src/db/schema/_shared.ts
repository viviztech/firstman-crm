import { pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const roleEnum = pgEnum("role", ["super_admin", "manager", "executive", "accountant"]);

/**
 * Every domain table gets these columns spread in, per spec 2: id (uuid v7),
 * createdAt/updatedAt, soft-delete via deletedAt, createdBy/updatedBy actor FKs.
 * createdBy/updatedBy reference user.id (text, better-auth's id type) and are
 * added per-table since drizzle-orm requires the FK target table in scope.
 */
export function baseColumns() {
  return {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  };
}

export function actorColumns() {
  return {
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  };
}
