import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { type ActorScope, isAssignedEmployee, visibilityConditions } from "@/lib/scope";
import {
  optionalEmailSchema,
  optionalTrimmed,
  optionalUuid,
  pincodeSchema,
} from "@/lib/validation/helpers";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { optionalGstinSchema, optionalPanSchema } from "@/lib/validation/tax-ids";
import { recordActivity } from "@/services/activity-log";
import { getSettingForUpdate, setSetting } from "@/services/settings";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
  referralPartnerId: optionalUuid,
});

export type ClientInput = z.infer<typeof clientInputSchema>;

const PAGE_SIZE = 20;

/**
 * Executives only ever see/act on clients in scope — internal-type by assignedTo, franchise-type
 * by pincode territory, both further narrowed by service assignment if configured (spec 3, ADR 0001).
 */
function scopeCondition(scope: ActorScope) {
  return visibilityConditions(scope, {
    assignedToColumn: clients.assignedTo,
    pincodeColumn: clients.pincode,
  });
}

/** Internal-type executives can't assign clients to anyone but themselves; franchise-type staff
 * (territory-shared) can assign within their team, regardless of what the form submits (ADR 0001). */
function enforceAssignment(input: ClientInput, actor: ActorScope): ClientInput {
  if (actor.role === "executive" && isAssignedEmployee(actor)) {
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
    const searchCondition = or(
      ilike(clients.name, term),
      ilike(clients.phone, term),
      ilike(clients.cin, term),
    );
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

/** Unscoped fetch for notification jobs — system-context, not a user request (mirrors getInvoiceForPdf). */
export async function getClientForNotification(clientId: string) {
  return db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), isNull(clients.deletedAt)),
    columns: { id: true, name: true, phone: true, email: true, whatsappOptedOut: true },
  });
}

/** Manual stand-in for the inbound "STOP" webhook (spec 4.8) — flips the client's opt-out flag. */
export async function setWhatsAppOptOut(id: string, optedOut: boolean, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const conditions = [eq(clients.id, id), isNull(clients.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(clients)
      .set({ whatsappOptedOut: optedOut, updatedBy: actor.userId })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "client",
        entityId: updated.id,
        action: optedOut ? "whatsapp_opted_out" : "whatsapp_opted_in",
      },
      tx,
    );

    return updated;
  });
}

/**
 * Customer Identification Number, format FM<4-digit year><6-digit seq> (ADR 0002/0003) — same
 * settings-row-lock sequence pattern as generateOrderNo/generateInvoiceNo, per-year reset.
 */
export async function generateClientCin(tx: Transaction, actor: ActorScope): Promise<string> {
  const year = new Date().getFullYear();
  const key = `clientCinSeq:${year}`;
  const last = await getSettingForUpdate<number>(key, 0, tx);
  const next = last + 1;
  await setSetting(key, next, actor, tx);
  return `FM${year}${String(next).padStart(6, "0")}`;
}

export async function createClient(input: ClientInput, actor: ActorScope) {
  const values = enforceAssignment(input, actor);

  return db.transaction(async (tx) => {
    const cin = await generateClientCin(tx, actor);
    const [created] = await tx
      .insert(clients)
      .values({ ...values, cin, createdBy: actor.userId, updatedBy: actor.userId })
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
