import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { logger } from "@/lib/logger";
import { getBoss } from "@/lib/queue";

export async function GET(): Promise<NextResponse> {
  const checks: Record<"database" | "queue", "ok" | "error"> = {
    database: "error",
    queue: "error",
  };

  try {
    await db.execute(sql`select 1`);
    checks.database = "ok";
  } catch (error) {
    logger.error({ err: error }, "health check: database unreachable");
  }

  try {
    await getBoss();
    checks.queue = "ok";
  } catch (error) {
    logger.error({ err: error }, "health check: queue unreachable");
  }

  const healthy = checks.database === "ok" && checks.queue === "ok";

  return NextResponse.json(
    { status: healthy ? "ok" : "error", checks },
    { status: healthy ? 200 : 503 },
  );
}
