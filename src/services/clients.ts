import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import type { ActorScope } from "@/lib/scope";
import { optionalEmailSchema, optionalTrimmed, pincodeSchema } from "@/lib/validation/helpers";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { optionalGstinSchema, optionalPanSchema } from "@/lib/validation/tax-ids";
import { recordActivity } from "@/services/activity-log";

export const clientInputSchema = z.object({
  type: z.enum(["individual", "business"]),
  name: z.string().trim().min(2, "Name is required").max(200),
  businessName: optionalTrimmed(200),
  phone: indianPhoneSchema,
  email: optionalEmailSchema,
  gstin: optionalGstinSchema,
  pan: optionalPanSchema,
  address: optionalTrimmed(500),
  city: optionalTrimmed(100),
  state: optionalTrimmed(100),
  pincode: pincodeSchema,
  assignedTo: optionalTrimmed(),
  referralSource: optionalTrimmed(200),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

const PAGE_SIZE = 20;

/** Executives only ever see/act on clients assigned to them — never trust the UI filter alone (spec 3). */
function scopeCondition(scope: ActorScope) {
  return scope.role === "executive" ? eq(clients.assignedTo, scope.userId) : undefined;
}

/** Executives can't assign clients to anyone but themselves, regardless of what the form submits. */
function enforceAssignment(input: ClientInput, actor: ActorScope): ClientInput {
  if (actor.role === "executive") {
    return { ...input, assignedTo: actor.userId };
  }
  return input;
}

export async function listClients(
  scope: ActorScope,
  opts: { page?: number; search?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(clients.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(clients.name, term), ilike(clients.phone, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.clients.findMany({
      where,
      orderBy: (client, { desc }) => [desc(client.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: { assignee: { columns: { id: true, name: true } } },
    }),
    db.select({ total: count() }).from(clients).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

/** Minimal {id, name, phone} list for select dropdowns (e.g. the order form's client picker), scoped like everything else. */
export async function listClientOptions(scope: ActorScope) {
  const conditions = [isNull(clients.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db
    .select({ id: clients.id, name: clients.name, phone: clients.phone })
    .from(clients)
    .where(and(...conditions))
    .orderBy(clients.name);
}

export async function getClient(id: string, scope: ActorScope) {
  const conditions = [eq(clients.id, id), isNull(clients.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.clients.findFirst({
    where: and(...conditions),
    with: { assignee: { columns: { id: true, name: true } } },
  });
}

export async function createClient(input: ClientInput, actor: ActorScope) {
  const values = enforceAssignment(input, actor);

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(clients)
      .values({ ...values, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create client");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "client",
        entityId: created.id,
        action: "created",
        diff: values,
      },
      tx,
    );

    return created;
  });
}

export async function updateClient(id: string, input: ClientInput, actor: ActorScope) {
  const values = enforceAssignment(input, actor);

  return db.transaction(async (tx) => {
    const conditions = [eq(clients.id, id), isNull(clients.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(clients)
      .set({ ...values, updatedBy: actor.userId })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "client",
        entityId: updated.id,
        action: "updated",
        diff: values,
      },
      tx,
    );

    return updated;
  });
}

export async function deleteClient(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(clients)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "client", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}
