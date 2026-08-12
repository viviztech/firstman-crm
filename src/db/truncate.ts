import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "@/lib/env";

/**
 * Every application table, in no particular order — a single multi-table TRUNCATE ... CASCADE
 * is order-independent (Postgres resolves FK dependencies itself, including invoices' self-
 * referencing proformaInvoiceId), so this doesn't need to be topologically sorted. Keep in sync
 * with src/db/schema/*.ts when a table is added or removed.
 */
const TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "settings",
  "activity_logs",
  "staff_profiles",
  "staff_pincode_allocations",
  "staff_service_assignments",
  "states",
  "districts",
  "pincodes",
  "service_verticals",
  "service_categories",
  "services",
  "service_price_history",
  "service_relations",
  "documents",
  "orders",
  "order_tasks",
  "compliance_items",
  "expenses",
  "message_logs",
  "referral_partners",
  "enquiries",
  "enquiry_followups",
  "invoices",
  "payments",
  "clients",
] as const;

/**
 * Deliberately never truncates drizzle-kit's own migration-tracking table — that lives in a
 * separate `drizzle` schema, outside this list, and wiping it would make drizzle think no
 * migrations had ever run.
 */
async function main(): Promise<void> {
  const isLocal = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL);
  if (!isLocal && !process.argv.includes("--force")) {
    console.error(
      `Refusing to truncate a non-local DATABASE_URL (${env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}). Pass --force to override.`,
    );
    process.exit(1);
  }

  const tableList = TABLES.map((table) => `"${table}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`));
  console.log(`Truncated ${TABLES.length} tables.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
