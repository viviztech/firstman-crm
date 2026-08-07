import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { enqueueEnquiryAssignedNotification } from "@/jobs/enquiry-notifications";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { createEnquiry, publicEnquiryInputSchema } from "@/services/enquiries";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

function isValidToken(token: string): boolean {
  const expected = Buffer.from(env.ENQUIRIES_API_TOKEN);
  const actual = Buffer.from(token);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { allowed } = rateLimit(`enquiries-api:${ip}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token || !isValidToken(token)) {
    logger.warn({ ip }, "enquiries API: unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = publicEnquiryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const created = await createEnquiry(parsed.data, null);

  if (created.assignedTo) {
    await enqueueEnquiryAssignedNotification({
      enquiryId: created.id,
      assignedTo: created.assignedTo,
    });
  }

  logger.info({ enquiryId: created.id }, "enquiries API: enquiry created");
  return NextResponse.json({ id: created.id }, { status: 201 });
}
