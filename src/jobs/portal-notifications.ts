import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { notifyClientWhatsApp, notifyEmail } from "@/jobs/notify";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

export const PORTAL_LOGIN_LINK_JOB = "portal-login-link";

type PortalLoginLinkPayload = {
  clientId: string;
  rawToken: string;
  channel: "email" | "whatsapp";
};

/**
 * The raw token travels in the payload rather than being re-fetched by id — a deliberate,
 * documented exception (ADR 0009 decision 5): only its hash is ever persisted, so there is
 * nothing to re-fetch. Never call the WhatsApp/email API inline — always enqueue (spec 4.8).
 */
export async function enqueuePortalLoginLinkNotification(
  payload: PortalLoginLinkPayload,
): Promise<void> {
  const boss = await getBoss();
  await boss.send(PORTAL_LOGIN_LINK_JOB, payload);
}

export async function processPortalLoginLinkJob(payload: PortalLoginLinkPayload): Promise<void> {
  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, payload.clientId), isNull(clients.deletedAt)),
    columns: { id: true, name: true, phone: true, email: true, whatsappOptedOut: true },
  });
  if (!client) {
    logger.warn(payload, "portal-login-link notification: client not found, skipping");
    return;
  }

  const loginUrl = getAppUrl(`/api/portal/verify?token=${payload.rawToken}`);

  if (payload.channel === "whatsapp") {
    await notifyClientWhatsApp({
      phone: client.phone,
      whatsappOptedOut: client.whatsappOptedOut,
      eventKey: "portal_login_link",
      bodyParams: [client.name, loginUrl],
      entityType: "client",
      entityId: client.id,
    });
    return;
  }

  await notifyEmail({
    to: client.email,
    subject: "Your FirstMan Corporate Services login link",
    heading: "Sign in to your portal",
    lines: [
      `Hi ${client.name}, use the link below to view your order status.`,
      "This link expires in 15 minutes and can only be used once.",
    ],
    ctaLabel: "Sign in",
    ctaUrl: loginUrl,
    template: "portal_login_link",
    entityType: "client",
    entityId: client.id,
  });
}

export async function registerPortalNotificationJobs(): Promise<void> {
  const boss = await getBoss();
  await boss.createQueue(PORTAL_LOGIN_LINK_JOB);

  await boss.work<PortalLoginLinkPayload>(PORTAL_LOGIN_LINK_JOB, async (jobs) => {
    for (const job of jobs) {
      await processPortalLoginLinkJob(job.data);
    }
  });
}
