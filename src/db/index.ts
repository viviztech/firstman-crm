import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as activitySchema from "@/db/schema/activity-logs";
import * as authSchema from "@/db/schema/auth-schema";
import * as catalogSchema from "@/db/schema/catalog";
import * as clientsSchema from "@/db/schema/clients";
import * as complianceSchema from "@/db/schema/compliance";
import * as documentsSchema from "@/db/schema/documents";
import * as enquiriesSchema from "@/db/schema/enquiries";
import * as expensesSchema from "@/db/schema/expenses";
import * as geographySchema from "@/db/schema/geography";
import * as invoicesSchema from "@/db/schema/invoices";
import * as messageLogsSchema from "@/db/schema/message-logs";
import * as ordersSchema from "@/db/schema/orders";
import * as referralPartnersSchema from "@/db/schema/referral-partners";
import * as settingsSchema from "@/db/schema/settings";
import * as staffSchema from "@/db/schema/staff";
import { env } from "@/lib/env";

const schema = {
  ...authSchema,
  ...settingsSchema,
  ...activitySchema,
  ...catalogSchema,
  ...clientsSchema,
  ...enquiriesSchema,
  ...ordersSchema,
  ...documentsSchema,
  ...complianceSchema,
  ...invoicesSchema,
  ...expensesSchema,
  ...messageLogsSchema,
  ...staffSchema,
  ...referralPartnersSchema,
  ...geographySchema,
};

declare global {
  var _postgresClient: postgres.Sql | undefined;
}

const client = globalThis._postgresClient ?? postgres(env.DATABASE_URL, { max: 10 });
if (env.NODE_ENV === "development") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });
