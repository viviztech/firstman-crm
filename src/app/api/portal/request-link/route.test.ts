import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { portalLoginTokens } from "@/db/schema/portal";

vi.mock("@/jobs/portal-notifications", () => ({
  enqueuePortalLoginLinkNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/portal/request-link/route";
import { enqueuePortalLoginLinkNotification } from "@/jobs/portal-notifications";

/** indianPhoneSchema requires digits only — randomUUID() slices can contain a-f, so build digits directly. */
function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function makeRequest(body: unknown, ip: string): NextRequest {
  return new NextRequest("http://localhost/api/portal/request-link", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/portal/request-link (integration)", () => {
  afterAll(async () => {
    const testClients = await db.query.clients.findMany({
      where: (client, { ilike }) => ilike(client.phone, "+91987667%"),
      columns: { id: true },
    });
    for (const client of testClients) {
      await db.delete(portalLoginTokens).where(eq(portalLoginTokens.clientId, client.id));
      await db.delete(clients).where(eq(clients.id, client.id));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the same generic response whether or not the identifier matches a client", async () => {
    const matchedPhone = `+91987667${randomDigits(4)}`;
    await db
      .insert(clients)
      .values({ type: "individual", name: "Portal Route Test Client", phone: matchedPhone });

    const matchedRes = await POST(makeRequest({ identifier: matchedPhone }, randomUUID()));
    const unmatchedRes = await POST(
      makeRequest({ identifier: `9876670${randomDigits(3)}` }, randomUUID()),
    );

    expect(matchedRes.status).toBe(200);
    expect(unmatchedRes.status).toBe(200);
    const matchedBody = await matchedRes.json();
    const unmatchedBody = await unmatchedRes.json();
    expect(matchedBody.message).toBe(unmatchedBody.message);

    expect(enqueuePortalLoginLinkNotification).toHaveBeenCalledTimes(1);
  });

  it("returns the generic response for malformed input too, without throwing", async () => {
    const res = await POST(makeRequest({ identifier: "not-a-phone-or-email" }, randomUUID()));
    expect(res.status).toBe(200);
    expect(enqueuePortalLoginLinkNotification).not.toHaveBeenCalled();
  });

  it("enforces the rate limit per IP", async () => {
    const ip = randomUUID();
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ identifier: `987667${randomDigits(4)}` }, ip));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(makeRequest({ identifier: `987667${randomDigits(4)}` }, ip));
    expect(blocked.status).toBe(429);
  });
});
