import { render } from "@react-email/render";
import nodemailer, { type Transporter } from "nodemailer";
import { NotificationEmail } from "@/emails/notification-email";
import { env } from "@/lib/env";

declare global {
  var _mailTransport: Transporter | undefined;
}

/** Cached transport per process (like the postgres client / pg-boss instance elsewhere). */
function getMailTransport(): Transporter {
  if (!globalThis._mailTransport) {
    globalThis._mailTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return globalThis._mailTransport;
}

export type MailResult = { ok: true } | { ok: false; error: string };

/**
 * Always attempts a real SMTP send (unlike the WhatsApp log driver) — a local SMTP
 * catcher (Mailpit/Mailhog) is the expected dev setup. A connection failure is caught
 * and returned as a result rather than thrown, so the caller can log it to message_logs.
 */
export async function sendNotificationEmail(input: {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<MailResult> {
  try {
    const html = await render(
      <NotificationEmail
        preview={input.subject}
        heading={input.heading}
        lines={input.lines}
        ctaLabel={input.ctaLabel}
        ctaUrl={input.ctaUrl}
      />,
    );

    await getMailTransport().sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      html,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email send failed" };
  }
}
