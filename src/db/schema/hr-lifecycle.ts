import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { user } from "@/db/schema/auth-schema";
import { employmentStatusEnum, staffProfiles } from "@/db/schema/staff";

/** Immutable employment transition history. No updated/deleted columns by design. */
export const employeeStatusHistory = pgTable(
  "employee_status_history",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "restrict" }),
    fromStatus: employmentStatusEnum("from_status").notNull(),
    toStatus: employmentStatusEnum("to_status").notNull(),
    effectiveDate: date("effective_date").notNull(),
    reason: text("reason").notNull(),
    previousJoinDate: date("previous_join_date"),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_status_history_profile_created_idx").on(table.staffProfileId, table.createdAt),
  ],
);
