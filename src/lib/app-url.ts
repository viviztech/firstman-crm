import { env } from "@/lib/env";

/** Builds an absolute in-app URL for email CTA links (relative paths don't render usefully in email clients). */
export function getAppUrl(path: string): string {
  return `${env.BETTER_AUTH_URL}${path}`;
}
