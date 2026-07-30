import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { messageLogs } from "@/db/schema/message-logs";
import { recordMessageLog } from "@/services/message-log";

describe("recordMessageLog (integration)", () => {
  const insertedIds: string[] = [];

  afterAll(async () => {
    for (const id of insertedIds) {
      await db.delete(messageLogs).where(eq(messageLogs.id, id));
    }
  });

  async function findLastLogFor(to: string) {
    const rows = await db.query.messageLogs.findMany({
      where: eq(messageLogs.to, to),
      orderBy: (log, { desc }) => [desc(log.createdAt)],
      limit: 1,
    });
    const row = rows[0];
    if (row) insertedIds.push(row.id);
    return row;
  }

  it("writes a 'sent' row with template, payload, and entity linkage", async () => {
    const to = `+919876608${randomUUID().slice(0, 6)}`;
    await recordMessageLog({
      channel: "whatsapp",
      to,
      template: "order_status_update",
      payload: { bodyParams: ["FM-2026-0001"] },
      status: "sent",
      entityType: "order",
      entityId: randomUUID(),
    });

    const row = await findLastLogFor(to);
    expect(row?.channel).toBe("whatsapp");
    expect(row?.status).toBe("sent");
    expect(row?.template).toBe("order_status_update");
    expect(row?.payload).toEqual({ bodyParams: ["FM-2026-0001"] });
    expect(row?.entityType).toBe("order");
    expect(row?.error).toBeNull();
  });

  it("writes a 'failed' row with the error message", async () => {
    const to = `mailtest-${randomUUID()}@example.com`;
    await recordMessageLog({
      channel: "email",
      to,
      template: "invoice_sent",
      status: "failed",
      error: "ECONNREFUSED",
    });

    const row = await findLastLogFor(to);
    expect(row?.status).toBe("failed");
    expect(row?.error).toBe("ECONNREFUSED");
  });

  it("writes a 'skipped' row for an opted-out client, with no error", async () => {
    const to = `+919876609${randomUUID().slice(0, 6)}`;
    await recordMessageLog({
      channel: "whatsapp",
      to,
      template: "docs_pending_reminder",
      status: "skipped",
    });

    const row = await findLastLogFor(to);
    expect(row?.status).toBe("skipped");
    expect(row?.error).toBeNull();
  });
});
