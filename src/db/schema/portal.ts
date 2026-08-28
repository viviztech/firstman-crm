import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { clients } from "@/db/schema/clients";

/**
 * Customer magic-link auth (ADR 0009) — deliberately separate from better-auth's `user` table
 * (which is staff-only) and from `src/lib/signed-url.ts`'s stateless HMAC tokens (which can't be
 * revoked or made single-use). Both tables here store only a hash of the bearer secret — the raw
 * token/session value is never persisted, only handed to the client once.
 */
export const portalLoginTokens = pgTable(
  "portal_login_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    channel: text("channel").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    requestIp: text("request_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portal_login_tokens_hash_idx").on(table.tokenHash),
    index("portal_login_tokens_client_idx").on(table.clientId),
  ],
);

export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("portal_sessions_hash_idx").on(table.tokenHash)],
);
