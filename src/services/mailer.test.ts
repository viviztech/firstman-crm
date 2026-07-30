import { describe, expect, it } from "vitest";
import { sendNotificationEmail } from "@/services/mailer";

describe("sendNotificationEmail (integration)", () => {
  it("always resolves — never throws — even when no SMTP server is reachable", async () => {
    const result = await sendNotificationEmail({
      to: "test@example.com",
      subject: "Test subject",
      heading: "Test heading",
      lines: ["Line one", "Line two"],
      ctaLabel: "View",
      ctaUrl: "https://example.com",
    });

    if (result.ok) {
      expect(result).toEqual({ ok: true });
    } else {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
