import { sendNotificationEmail } from "@/services/mailer";
import { recordMessageLog } from "@/services/message-log";
import { getWhatsAppTemplateName, sendWhatsAppTemplate } from "@/services/whatsapp";

/**
 * Shared send+log pattern for every notification job (spec 4.8). Every attempt gets a
 * message_logs row — sent, failed (with the driver's error), or skipped (opted out) —
 * so message_logs always reflects reality, including under the WhatsApp log driver.
 */
export async function notifyClientWhatsApp(params: {
  phone: string;
  whatsappOptedOut: boolean;
  eventKey: string;
  bodyParams?: string[];
  entityType: string;
  entityId: string;
}): Promise<void> {
  if (params.whatsappOptedOut) {
    await recordMessageLog({
      channel: "whatsapp",
      to: params.phone,
      template: params.eventKey,
      status: "skipped",
      entityType: params.entityType,
      entityId: params.entityId,
    });
    return;
  }

  const templateName = await getWhatsAppTemplateName(params.eventKey);
  const result = await sendWhatsAppTemplate({
    to: params.phone,
    templateName,
    bodyParams: params.bodyParams,
  });

  await recordMessageLog({
    channel: "whatsapp",
    to: params.phone,
    template: templateName,
    payload: { bodyParams: params.bodyParams },
    status: result.ok ? "sent" : "failed",
    error: result.ok ? undefined : result.error,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}

export async function notifyEmail(params: {
  to: string | null | undefined;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  template: string;
  entityType: string;
  entityId?: string;
}): Promise<void> {
  if (!params.to) return; // no email on file — nothing to send or log

  const result = await sendNotificationEmail({
    to: params.to,
    subject: params.subject,
    heading: params.heading,
    lines: params.lines,
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
  });

  await recordMessageLog({
    channel: "email",
    to: params.to,
    template: params.template,
    payload: { subject: params.subject, heading: params.heading, lines: params.lines },
    status: result.ok ? "sent" : "failed",
    error: result.ok ? undefined : result.error,
    entityType: params.entityType,
    entityId: params.entityId,
  });
}
