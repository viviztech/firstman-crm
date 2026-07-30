import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { messageLogs } from "@/db/schema/message-logs";
import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";

// WHATSAPP_TOKEN is empty in the test .env, so WhatsApp sends here exercise the log driver
// and always resolve ok — the interesting behavior under test is the message_logs bookkeeping.

describe("notify (integration)", () => {
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

  describe("notifyClientWhatsApp", () => {
    it("writes a 'sent' row when the client hasn't opted out", async () => {
      const phone = `+919876610${randomUUID().slice(0, 6)}`;
      await notifyClientWhatsApp({
        phone,
        whatsappOptedOut: false,
        eventKey: "order_status_changed",
        bodyParams: ["Jane Doe", "FM-2026-0001", "in_progress"],
        entityType: "order",
        entityId: randomUUID(),
      });

      const row = await findLastLogFor(phone);
      expect(row?.channel).toBe("whatsapp");
      expect(row?.status).toBe("sent");
      expect(row?.template).toBe("order_status_update");
    });

    it("writes a 'skipped' row when the client has opted out, without calling the send driver", async () => {
      const phone = `+919876611${randomUUID().slice(0, 6)}`;
      await notifyClientWhatsApp({
        phone,
        whatsappOptedOut: true,
        eventKey: "payment_received",
        entityType: "invoice",
        entityId: randomUUID(),
      });

      const row = await findLastLogFor(phone);
      expect(row?.status).toBe("skipped");
      expect(row?.error).toBeNull();
    });
  });

  describe("notifyEmail", () => {
    it("writes a message_logs row (sent or failed) when a recipient is given", async () => {
      const to = `notify-test-${randomUUID()}@example.com`;
      await notifyEmail({
        to,
        subject: "Test",
        heading: "Test heading",
        lines: ["Line one"],
        template: "test_template",
        entityType: "order",
        entityId: randomUUID(),
      });

      const row = await findLastLogFor(to);
      expect(row?.channel).toBe("email");
      expect(["sent", "failed"]).toContain(row?.status);
    });

    it("sends and logs nothing when there is no recipient email", async () => {
      const uniqueTemplate = `unreachable-test-marker-${randomUUID()}`;

      await notifyEmail({
        to: null,
        subject: "Should not send",
        heading: "Should not send",
        lines: [],
        template: uniqueTemplate,
        entityType: "order",
        entityId: randomUUID(),
      });

      const rows = await db.query.messageLogs.findMany({
        where: eq(messageLogs.template, uniqueTemplate),
      });
      expect(rows).toHaveLength(0);
    });
  });
});
