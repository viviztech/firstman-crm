import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueuePortalLoginLinkNotification } from "@/jobs/portal-notifications";
import { rateLimit } from "@/lib/rate-limit";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { requestPortalLoginLink } from "@/services/portal-auth";

const requestLinkSchema = z.object({
  identifier: z.union([indianPhoneSchema, z.string().trim().toLowerCase().email()]),
});

const GENERIC_MESSAGE =
  "If that phone number or email matches an account, we've sent a login link.";

/**
 * Public, enumeration-safe (ADR 0009 decision 6): always the same response, whether or not the
 * identifier matched a client — only the internal work differs.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { allowed } = rateLimit(`portal-request-link:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const parsed = requestLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const { allowed: identifierAllowed } = rateLimit(
    `portal-request-link:identifier:${parsed.data.identifier}`,
    { limit: 5, windowMs: 15 * 60_000 },
  );
  if (identifierAllowed) {
    const result = await requestPortalLoginLink(parsed.data.identifier, ip);
    if (result) {
      await enqueuePortalLoginLinkNotification(result);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
