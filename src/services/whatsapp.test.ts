import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { settings } from "@/db/schema/settings";
import { env } from "@/lib/env";
import {
  getWhatsAppTemplateName,
  sendWhatsAppDocument,
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/services/whatsapp";

// WHATSAPP_TOKEN is empty in the test .env, so every call below exercises the log driver
// (spec 4.8: "when WHATSAPP_TOKEN is empty, use a console/log driver so dev works offline").

describe("whatsapp service — log driver (integration)", () => {
  it("sendWhatsAppTemplate resolves ok without a real API call", async () => {
    const result = await sendWhatsAppTemplate({
      to: "+919876607001",
      templateName: "test_template",
      bodyParams: ["Jane Doe"],
    });
    expect(result).toEqual({ ok: true });
  });

  it("sendWhatsAppText resolves ok without a real API call", async () => {
    const result = await sendWhatsAppText({ to: "+919876607002", body: "Hello there" });
    expect(result).toEqual({ ok: true });
  });

  it("sendWhatsAppDocument resolves ok without a real API call", async () => {
    const result = await sendWhatsAppDocument({
      to: "+919876607003",
      documentUrl: "https://example.com/invoice.pdf",
      filename: "invoice.pdf",
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("whatsapp service — real API driver (WHATSAPP_TOKEN set)", () => {
  const originalToken = env.WHATSAPP_TOKEN;
  const originalPhoneId = env.WHATSAPP_PHONE_NUMBER_ID;

  beforeEach(() => {
    env.WHATSAPP_TOKEN = "test-token";
    env.WHATSAPP_PHONE_NUMBER_ID = "123456";
  });

  afterEach(() => {
    env.WHATSAPP_TOKEN = originalToken;
    env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneId;
    vi.unstubAllGlobals();
  });

  it("posts to the Graph API and returns ok on a 200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppTemplate({
      to: "+919876607004",
      templateName: "order_status_update",
      bodyParams: ["Jane"],
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("123456/messages");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("919876607004");
    expect(body.template.name).toBe("order_status_update");
  });

  it("returns ok:false with the response body when the Graph API responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid token" }),
    );

    const result = await sendWhatsAppText({ to: "+919876607005", body: "Hi" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("401");
      expect(result.error).toContain("invalid token");
    }
  });

  it("returns ok:false when fetch throws (network failure)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")));

    const result = await sendWhatsAppDocument({
      to: "+919876607006",
      documentUrl: "https://example.com/x.pdf",
      filename: "x.pdf",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("network unreachable");
    }
  });

  it("omits the components field when a template has no body params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendWhatsAppTemplate({ to: "+919876607007", templateName: "no_params_template" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.template.components).toBeUndefined();
  });
});

describe("getWhatsAppTemplateName", () => {
  const key = "whatsappTemplates";

  beforeEach(async () => {
    await db.delete(settings).where(eq(settings.key, key));
  });

  afterEach(async () => {
    await db.delete(settings).where(eq(settings.key, key));
  });

  it("falls back to the built-in default when no setting override exists", async () => {
    const name = await getWhatsAppTemplateName("order_status_changed");
    expect(name).toBe("order_status_update");
  });

  it("falls back to the event key itself for an unknown event with no default", async () => {
    const name = await getWhatsAppTemplateName("some_unmapped_event");
    expect(name).toBe("some_unmapped_event");
  });

  it("prefers a settings override over the built-in default", async () => {
    await db.insert(settings).values({
      key,
      value: { order_status_changed: "custom_order_template_v2" },
    });

    const name = await getWhatsAppTemplateName("order_status_changed");
    expect(name).toBe("custom_order_template_v2");

    // sanity: the row really is what we think it is
    const row = await db.query.settings.findFirst({
      where: and(eq(settings.key, key), isNull(settings.deletedAt)),
    });
    expect(row?.value).toEqual({ order_status_changed: "custom_order_template_v2" });
  });
});
