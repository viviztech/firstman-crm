import { PgBoss } from "pg-boss";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

declare global {
  var _pgBoss: PgBoss | undefined;
  var _pgBossStarted: Promise<PgBoss> | undefined;
}

function createBoss(): PgBoss {
  const boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on("error", (error: Error) => logger.error({ err: error }, "pg-boss error"));
  return boss;
}

/** Lazily starts a single pg-boss instance per process (cached across hot reloads in dev). */
export async function getBoss(): Promise<PgBoss> {
  if (!globalThis._pgBossStarted) {
    const boss = globalThis._pgBoss ?? createBoss();
    globalThis._pgBoss = boss;
    globalThis._pgBossStarted = boss.start().then(() => boss);
  }
  return globalThis._pgBossStarted;
}
