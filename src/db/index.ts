import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as activitySchema from "@/db/schema/activity-logs";
import * as attendanceSchema from "@/db/schema/attendance";
import * as authSchema from "@/db/schema/auth-schema";
import * as catalogSchema from "@/db/schema/catalog";
import * as clientsSchema from "@/db/schema/clients";
import * as complianceSchema from "@/db/schema/compliance";
import * as documentsSchema from "@/db/schema/documents";
import * as enquiriesSchema from "@/db/schema/enquiries";
import * as expensesSchema from "@/db/schema/expenses";
import * as franchiseSchema from "@/db/schema/franchise";
import * as geographySchema from "@/db/schema/geography";
import * as hrSchema from "@/db/schema/hr";
import * as hrDocumentsSchema from "@/db/schema/hr-documents";
import * as hrImportsSchema from "@/db/schema/hr-imports";
import * as hrLifecycleSchema from "@/db/schema/hr-lifecycle";
import * as hrPrivateSchema from "@/db/schema/hr-private";
import * as invoicesSchema from "@/db/schema/invoices";
import * as leaveSchema from "@/db/schema/leave";
import * as messageLogsSchema from "@/db/schema/message-logs";
import * as notificationsSchema from "@/db/schema/notifications";
import * as ordersSchema from "@/db/schema/orders";
import * as payrollSchema from "@/db/schema/payroll";
import * as portalSchema from "@/db/schema/portal";
import * as quotesSchema from "@/db/schema/quotes";
import * as referralPartnersSchema from "@/db/schema/referral-partners";
import * as settingsSchema from "@/db/schema/settings";
import * as staffSchema from "@/db/schema/staff";
import { env } from "@/lib/env";

const schema = {
  ...authSchema,
  ...attendanceSchema,
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
  ...franchiseSchema,
  ...messageLogsSchema,
  ...notificationsSchema,
  ...staffSchema,
  ...referralPartnersSchema,
  ...geographySchema,
  ...hrSchema,
  ...hrDocumentsSchema,
  ...hrImportsSchema,
  ...hrLifecycleSchema,
  ...hrPrivateSchema,
  ...leaveSchema,
  ...portalSchema,
  ...payrollSchema,
  ...quotesSchema,
};

declare global {
  var _postgresClient: postgres.Sql | undefined;
}

const client = globalThis._postgresClient ?? postgres(env.DATABASE_URL, { max: 10 });
if (env.NODE_ENV === "development") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });
