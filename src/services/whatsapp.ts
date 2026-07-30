import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getSetting } from "@/services/settings";

const GRAPH_API_VERSION = "v21.0";

/** Default event-key -> WhatsApp template name mapping, overridable via the `whatsappTemplates` setting (spec 4.10). */
const DEFAULT_TEMPLATES: Record<string, string> = {
  order_status_changed: "order_status_update",
  compliance_reminder: "compliance_deadline_reminder",
  invoice_sent: "invoice_sent",
  payment_received: "payment_received",
  docs_pending_reminder: "docs_pending_reminder",
};

export async function getWhatsAppTemplateName(eventKey: string): Promise<string> {
  const overrides = await getSetting<Record<string, string>>("whatsappTemplates", {});
  return overrides[eventKey] ?? DEFAULT_TEMPLATES[eventKey] ?? eventKey;
}

export type WhatsAppResult = { ok: true } | { ok: false; error: string };

/** Meta expects digits only, no leading "+" (clients.phone is stored E.164 with a leading "+"). */
function toWhatsAppNumber(phone: string): string {
  return phone.replace(/^\+/, "");
}

async function callGraphApi(body: unknown): Promise<WhatsAppResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return { ok: false, error: `WhatsApp API ${response.status}: ${errorBody.slice(0, 500)}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "WhatsApp send failed" };
  }
}

/** Template messages work outside the 24h customer-service window — the usual notification path. */
export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<WhatsAppResult> {
  if (!env.WHATSAPP_TOKEN) {
    logger.info({ to: input.to, template: input.templateName }, "whatsapp (log driver): template");
    return { ok: true };
  }

  return callGraphApi({
    messaging_product: "whatsapp",
    to: toWhatsAppNumber(input.to),
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode ?? "en" },
      ...(input.bodyParams && input.bodyParams.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: input.bodyParams.map((text) => ({ type: "text", text })),
              },
            ],
          }
        : {}),
    },
  });
}

/** Free-form text only works inside the 24h session window opened by a prior inbound message. */
export async function sendWhatsAppText(input: {
  to: string;
  body: string;
}): Promise<WhatsAppResult> {
  if (!env.WHATSAPP_TOKEN) {
    logger.info({ to: input.to, body: input.body }, "whatsapp (log driver): text");
    return { ok: true };
  }

  return callGraphApi({
    messaging_product: "whatsapp",
    to: toWhatsAppNumber(input.to),
    type: "text",
    text: { body: input.body },
  });
}

export async function sendWhatsAppDocument(input: {
  to: string;
  documentUrl: string;
  filename: string;
  caption?: string;
}): Promise<WhatsAppResult> {
  if (!env.WHATSAPP_TOKEN) {
    logger.info(
      { to: input.to, documentUrl: input.documentUrl, filename: input.filename },
      "whatsapp (log driver): document",
    );
    return { ok: true };
  }

  return callGraphApi({
    messaging_product: "whatsapp",
    to: toWhatsAppNumber(input.to),
    type: "document",
    document: { link: input.documentUrl, filename: input.filename, caption: input.caption },
  });
}
