import { boolean, integer, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { actorColumns, baseColumns } from "@/db/schema/_shared";

/**
 * External associates (spec: "employee type 3") never log in — they're a referral/commission
 * entity, not a CRM user. Linked from enquiries/clients via referralPartnerId. See ADR 0001.
 */
export const commissionTypeEnum = pgEnum("commission_type", ["percentage", "flat"]);

export const referralPartners = pgTable(
  "referral_partners",
  {
    ...baseColumns(),
    ...actorColumns(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    commissionType: commissionTypeEnum("commission_type"),
    // Percentage: basis points (e.g. 500 = 5.00%). Flat: paise. Interpreted per commissionType.
    commissionRate: integer("commission_rate"),
    active: boolean("active").notNull().default(true),
  },
  (table) => [uniqueIndex("referral_partners_phone_idx").on(table.phone)],
);
