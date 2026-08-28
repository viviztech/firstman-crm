import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { portalLoginTokens, portalSessions } from "@/db/schema/portal";
import {
  createPortalSession,
  getPortalSession,
  requestPortalLoginLink,
  revokePortalSession,
  verifyPortalLoginToken,
} from "@/services/portal-auth";

describe("portal-auth service (integration)", () => {
  async function makeClient(overrides: { phone: string; email?: string | null }) {
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Portal Auth Test Client",
        phone: overrides.phone,
        email: overrides.email ?? null,
      })
      .returning();
    if (!client) throw new Error("failed to create fixture client");
    return client;
  }

  afterAll(async () => {
    const testClients = await db.query.clients.findMany({
      where: (client, { ilike }) => ilike(client.phone, "+919876650%"),
      columns: { id: true },
    });
    const clientIds = testClients.map((c) => c.id);
    for (const clientId of clientIds) {
      await db.delete(portalLoginTokens).where(eq(portalLoginTokens.clientId, clientId));
      await db.delete(portalSessions).where(eq(portalSessions.clientId, clientId));
      await db.delete(clients).where(eq(clients.id, clientId));
    }
  });

  it("issues a token for a matching phone and rejects an unrecognized identifier without error", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    await makeClient({ phone });

    const result = await requestPortalLoginLink(phone, "127.0.0.1");
    expect(result?.rawToken).toBeTruthy();
    expect(result?.channel).toBe("whatsapp");

    const noMatch = await requestPortalLoginLink(
      `+919876650${randomUUID().slice(0, 6)}`,
      "127.0.0.1",
    );
    expect(noMatch).toBeNull();
  });

  it("routes an email identifier to the email channel when the client has one on file", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    const email = `portal-auth-${randomUUID()}@example.com`;
    await makeClient({ phone, email });

    const result = await requestPortalLoginLink(email, null);
    expect(result?.channel).toBe("email");
  });

  it("consumes a login token exactly once — a second attempt fails", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    await makeClient({ phone });
    const issued = await requestPortalLoginLink(phone, null);
    if (!issued) throw new Error("expected a token to be issued");

    const first = await verifyPortalLoginToken(issued.rawToken);
    expect(first?.clientId).toBe(issued.clientId);

    const second = await verifyPortalLoginToken(issued.rawToken);
    expect(second).toBeNull();
  });

  it("rejects an expired login token", async () => {
    // Real Postgres query (via portal-auth's DB calls) doesn't mix well with vi.useFakeTimers()
    // (it can hang the driver's own internal timers), so expiry is forced directly in the DB
    // instead of faking the system clock — see rate-limit.test.ts for the fake-timer pattern
    // reserved for pure in-memory logic.
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    await makeClient({ phone });

    const issued = await requestPortalLoginLink(phone, null);
    if (!issued) throw new Error("expected a token to be issued");

    await db
      .update(portalLoginTokens)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(portalLoginTokens.clientId, issued.clientId));

    const verified = await verifyPortalLoginToken(issued.rawToken);
    expect(verified).toBeNull();
  });

  it("creates, reads, and revokes a portal session", async () => {
    const phone = `+919876650${randomUUID().slice(0, 6)}`;
    const client = await makeClient({ phone });

    const rawSession = await createPortalSession(client.id);
    const session = await getPortalSession(rawSession);
    expect(session?.clientId).toBe(client.id);

    await revokePortalSession(rawSession);
    expect(await getPortalSession(rawSession)).toBeNull();
  });

  it("rejects a garbage session token without throwing", async () => {
    expect(await getPortalSession("not-a-real-token")).toBeNull();
  });
});
