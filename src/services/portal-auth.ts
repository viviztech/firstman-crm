import { createHash, randomBytes } from "node:crypto";
import { addDays, addMinutes } from "date-fns";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { portalLoginTokens, portalSessions } from "@/db/schema/portal";

const LOGIN_TOKEN_TTL_MINUTES = 15;
const SESSION_TTL_DAYS = 30;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Looks up a client by phone or email and, on a match, issues a single-use login token — but
 * does the same amount of work and returns the same shape either way (ADR 0009 decision 6), so a
 * caller can never learn from timing or response whether the identifier matched a real client.
 */
export async function requestPortalLoginLink(
  identifier: string,
  requestIp: string | null,
): Promise<{ rawToken: string; clientId: string; channel: "email" | "whatsapp" } | null> {
  const client = await db.query.clients.findFirst({
    where: and(
      isNull(clients.deletedAt),
      identifier.includes("@") ? eq(clients.email, identifier) : eq(clients.phone, identifier),
    ),
    columns: { id: true, email: true, phone: true },
  });
  if (!client) return null;

  const rawToken = generateToken();
  const channel: "email" | "whatsapp" =
    identifier.includes("@") && client.email ? "email" : "whatsapp";

  await db.insert(portalLoginTokens).values({
    clientId: client.id,
    tokenHash: hashToken(rawToken),
    channel,
    expiresAt: addMinutes(new Date(), LOGIN_TOKEN_TTL_MINUTES),
    requestIp,
  });

  return { rawToken, clientId: client.id, channel };
}

/** Atomic single-use consumption — a second attempt on the same raw token always fails, race-free. */
export async function verifyPortalLoginToken(
  rawToken: string,
): Promise<{ clientId: string } | null> {
  const tokenHash = hashToken(rawToken);

  const [consumed] = await db
    .update(portalLoginTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(portalLoginTokens.tokenHash, tokenHash),
        isNull(portalLoginTokens.consumedAt),
        gt(portalLoginTokens.expiresAt, new Date()),
      ),
    )
    .returning({ clientId: portalLoginTokens.clientId });

  return consumed ? { clientId: consumed.clientId } : null;
}

export async function createPortalSession(clientId: string): Promise<string> {
  const rawSession = generateToken();

  await db.insert(portalSessions).values({
    clientId,
    tokenHash: hashToken(rawSession),
    expiresAt: addDays(new Date(), SESSION_TTL_DAYS),
  });

  return rawSession;
}

export async function getPortalSession(
  rawSessionToken: string,
): Promise<{ clientId: string } | null> {
  const session = await db.query.portalSessions.findFirst({
    where: and(
      eq(portalSessions.tokenHash, hashToken(rawSessionToken)),
      isNull(portalSessions.revokedAt),
      gt(portalSessions.expiresAt, new Date()),
    ),
    columns: { clientId: true },
  });
  return session ?? null;
}

export async function revokePortalSession(rawSessionToken: string): Promise<void> {
  await db
    .update(portalSessions)
    .set({ revokedAt: new Date() })
    .where(eq(portalSessions.tokenHash, hashToken(rawSessionToken)));
}
