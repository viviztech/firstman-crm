import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { enqueueLeadAssignedNotification } from "@/jobs/lead-notifications";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { createLead, publicLeadInputSchema } from "@/services/leads";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };

function isValidToken(token: string): boolean {
  const expected = Buffer.from(env.LEADS_API_TOKEN);
  const actual = Buffer.from(token);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const { allowed } = rateLimit(`leads-api:${ip}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token || !isValidToken(token)) {
    logger.warn({ ip }, "leads API: unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = publicLeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const created = await createLead(parsed.data, null);

  if (created.assignedTo) {
    await enqueueLeadAssignedNotification({ leadId: created.id, assignedTo: created.assignedTo });
  }

  logger.info({ leadId: created.id }, "leads API: lead created");
  return NextResponse.json({ id: created.id }, { status: 201 });
}
