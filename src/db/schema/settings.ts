import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";

export const settings = pgTable("settings", {
  ...baseColumns(),
  ...actorColumns(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
});
