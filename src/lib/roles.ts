/**
 * Split out from src/lib/auth.ts so client components can import the role list without
 * pulling in that file's server-only betterAuth instance (which drags the Postgres driver
 * into the client bundle — `net`/`tls`/`fs` module-not-found errors at build time).
 */
export const ROLES = ["super_admin", "manager", "executive", "accountant"] as const;
export type Role = (typeof ROLES)[number];
