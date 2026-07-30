import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema/settings";
import type { ActorScope } from "@/lib/scope";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

export async function getSetting<T>(
  key: string,
  defaultValue: T,
  executor: Executor = db,
): Promise<T> {
  const row = await executor.query.settings.findFirst({ where: eq(settings.key, key) });
  return row ? (row.value as T) : defaultValue;
}

export async function setSetting(
  key: string,
  value: unknown,
  actor: ActorScope | null,
  executor: Executor = db,
): Promise<void> {
  const existing = await executor.query.settings.findFirst({ where: eq(settings.key, key) });
  const actorId = actor?.userId ?? null;

  if (existing) {
    await executor.update(settings).set({ value, updatedBy: actorId }).where(eq(settings.key, key));
  } else {
    await executor.insert(settings).values({ key, value, createdBy: actorId, updatedBy: actorId });
  }
}

/** Row-locks the setting for the duration of the caller's transaction, serializing concurrent readers. */
export async function getSettingForUpdate<T>(
  key: string,
  defaultValue: T,
  tx: Transaction,
): Promise<T> {
  const rows = await tx.select().from(settings).where(eq(settings.key, key)).for("update");
  return rows[0] ? (rows[0].value as T) : defaultValue;
}
