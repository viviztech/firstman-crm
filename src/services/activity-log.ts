import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

type ActivityInput = {
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  diff?: unknown;
};

/** Appends one audit row. Call this from every mutating server action on core entities (spec 2). */
export async function recordActivity(input: ActivityInput, executor: Executor = db): Promise<void> {
  await executor.insert(activityLogs).values({
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    diff: input.diff ?? null,
  });
}
