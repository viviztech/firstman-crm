import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? "";

Sentry.init({
  dsn: dsn || undefined,
  enabled: dsn.length > 0,
  tracesSampleRate: 1.0,
});
