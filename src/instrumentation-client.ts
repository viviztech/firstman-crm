const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, enabled: true, tracesSampleRate: 1.0 });
  });
}

export async function onRouterTransitionStart(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRouterTransitionStart>
) {
  if (!dsn) return;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRouterTransitionStart(...args);
}
