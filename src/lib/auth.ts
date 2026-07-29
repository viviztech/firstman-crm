import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/lib/env";
import { ac, accountantRole, executiveRole, managerRole, superAdminRole } from "@/lib/permissions";

export const ROLES = ["super_admin", "manager", "executive", "accountant"] as const;
export type Role = (typeof ROLES)[number];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        super_admin: superAdminRole,
        manager: managerRole,
        executive: executiveRole,
        accountant: accountantRole,
      },
      defaultRole: "executive",
      adminRoles: ["super_admin"],
    }),
  ],
});
