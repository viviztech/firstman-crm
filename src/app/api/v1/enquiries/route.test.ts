import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { enquiries } from "@/db/schema/enquiries";
import { env } from "@/lib/env";

vi.mock("@/jobs/enquiry-notifications", () => ({
  enqueueEnquiryAssignedNotification: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/v1/enquiries/route";

function makeRequest(body: unknown, opts: { token?: string; ip?: string } = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.token !== undefined) headers.set("authorization", `Bearer ${opts.token}`);
  if (opts.ip) headers.set("x-forwarded-for", opts.ip);

  return new NextRequest("http://localhost/api/v1/enquiries", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/enquiries (integration)", () => {
  afterAll(async () => {
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876601%"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without a bearer token", async () => {
    const res = await POST(
      makeRequest({ name: "X", phone: "9876601001", source: "website" }, { ip: randomUUID() }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong token", async () => {
    const res = await POST(
      makeRequest(
        { name: "X", phone: "9876601002", source: "website" },
        { token: "wrong-token", ip: randomUUID() },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid payloads with 400", async () => {
    const res = await POST(
      makeRequest({ phone: "not-a-phone" }, { token: env.ENQUIRIES_API_TOKEN, ip: randomUUID() }),
    );
    expect(res.status).toBe(400);
  });

  it("creates an enquiry with no staff creator and returns 201", async () => {
    const res = await POST(
      makeRequest(
        { name: "Public API Enquiry", phone: "9876601003", source: "website" },
        { token: env.ENQUIRIES_API_TOKEN, ip: randomUUID() },
      ),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();

    const created = await db.query.enquiries.findFirst({ where: eq(enquiries.id, body.id) });
    expect(created?.name).toBe("Public API Enquiry");
    expect(created?.createdBy).toBeNull();
  });

  it("never accepts an assignedTo from the request body", async () => {
    const res = await POST(
      makeRequest(
        {
          name: "Sneaky Assignment",
          phone: "9876601004",
          source: "website",
          assignedTo: "some-other-user-id",
        },
        { token: env.ENQUIRIES_API_TOKEN, ip: randomUUID() },
      ),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    const created = await db.query.enquiries.findFirst({ where: eq(enquiries.id, body.id) });
    expect(created?.assignedTo).not.toBe("some-other-user-id");
  });

  it("enforces the rate limit per IP", async () => {
    const ip = randomUUID();
    for (let i = 0; i < 30; i++) {
      const res = await POST(
        makeRequest(
          { name: `Bulk ${i}`, phone: `98766011${String(i).padStart(2, "0")}`, source: "website" },
          { token: env.ENQUIRIES_API_TOKEN, ip },
        ),
      );
      expect(res.status).toBe(201);
    }

    const blocked = await POST(
      makeRequest(
        { name: "Over limit", phone: "9876601199", source: "website" },
        { token: env.ENQUIRIES_API_TOKEN, ip },
      ),
    );
    expect(blocked.status).toBe(429);
  });
});
