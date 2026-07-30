import { and, asc, count, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { clients } from "@/db/schema/clients";
import {
  leadFollowupChannelEnum,
  leadFollowups,
  leadSourceEnum,
  leadStatusEnum,
  leads,
} from "@/db/schema/leads";
import type { ActorScope } from "@/lib/scope";
import {
  optionalDateTime,
  optionalEmailSchema,
  optionalTrimmed,
  optionalUuid,
} from "@/lib/validation/helpers";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { recordActivity } from "@/services/activity-log";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  phone: indianPhoneSchema,
  email: optionalEmailSchema,
  city: optionalTrimmed(100),
  source: z.enum(leadSourceEnum.enumValues),
  serviceInterestedId: optionalUuid,
  assignedTo: optionalTrimmed(),
  nextFollowUpAt: optionalDateTime,
  notes: optionalTrimmed(2000),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/** Public API leads never carry an internal assignee — round-robin/manual assignment is a staff-only concern. */
export const publicLeadInputSchema = leadInputSchema.omit({ assignedTo: true });

export type PublicLeadInput = z.infer<typeof publicLeadInputSchema>;

export const leadStatusUpdateSchema = z
  .object({
    status: z.enum(leadStatusEnum.enumValues),
    lostReason: optionalTrimmed(500),
  })
  .refine((data) => data.status !== "lost" || !!data.lostReason, {
    message: "A reason is required when marking a lead as lost",
    path: ["lostReason"],
  });

export type LeadStatusUpdate = z.infer<typeof leadStatusUpdateSchema>;

export const leadFollowupInputSchema = z.object({
  channel: z.enum(leadFollowupChannelEnum.enumValues),
  summary: z.string().trim().min(2, "Summary is required").max(1000),
  nextFollowUpAt: optionalDateTime,
});

export type LeadFollowupInput = z.infer<typeof leadFollowupInputSchema>;

const PAGE_SIZE = 20;
export const LEAD_AUTO_ASSIGNMENT_KEY = "leadAutoAssignment";
const LEAD_ROUND_ROBIN_CURSOR_KEY = "leadRoundRobinCursor";

export async function isLeadAutoAssignmentEnabled(): Promise<boolean> {
  return getSetting<boolean>(LEAD_AUTO_ASSIGNMENT_KEY, false);
}

/** Executives only ever see/act on leads assigned to them — never trust the UI filter alone (spec 3). */
function scopeCondition(scope: ActorScope) {
  return scope.role === "executive" ? eq(leads.assignedTo, scope.userId) : undefined;
}

function enforceAssignment(assignedTo: string | undefined, actor: ActorScope | null) {
  if (actor?.role === "executive") {
    return actor.userId;
  }
  return assignedTo;
}

/** Pure cursor-advance logic, extracted so it can be unit-tested without a database. */
export function nextInRoundRobin(
  candidateIds: string[],
  lastAssigned: string | null,
): string | undefined {
  if (candidateIds.length === 0) return undefined;
  const lastIndex = lastAssigned === null ? -1 : candidateIds.indexOf(lastAssigned);
  return candidateIds[(lastIndex + 1) % candidateIds.length];
}

async function pickRoundRobinAssignee(
  tx: Transaction,
  actor: ActorScope | null,
): Promise<string | undefined> {
  const executives = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "executive"))
    .orderBy(asc(user.id));

  const lastAssigned = await getSettingForUpdate<string | null>(
    LEAD_ROUND_ROBIN_CURSOR_KEY,
    null,
    tx,
  );
  const next = nextInRoundRobin(
    executives.map((executive) => executive.id),
    lastAssigned,
  );
  if (!next) return undefined;

  await setSetting(LEAD_ROUND_ROBIN_CURSOR_KEY, next, actor, tx);
  return next;
}

export async function listLeads(
  scope: ActorScope,
  opts: { page?: number; search?: string; status?: string; source?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(leads.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(leads.name, term), ilike(leads.phone, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (opts.status)
    conditions.push(eq(leads.status, opts.status as (typeof leadStatusEnum.enumValues)[number]));
  if (opts.source)
    conditions.push(eq(leads.source, opts.source as (typeof leadSourceEnum.enumValues)[number]));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.leads.findMany({
      where,
      orderBy: (lead, { desc }) => [desc(lead.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        assignee: { columns: { id: true, name: true } },
        serviceInterested: { columns: { id: true, name: true } },
      },
    }),
    db.select({ total: count() }).from(leads).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

/** All non-deleted leads in scope, unpaginated — the kanban board groups these client-side by status. */
export async function listLeadsForBoard(scope: ActorScope) {
  const conditions = [isNull(leads.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.leads.findMany({
    where: and(...conditions),
    orderBy: (lead, { desc }) => [desc(lead.createdAt)],
    with: { assignee: { columns: { id: true, name: true } } },
  });
}

export async function getLead(id: string, scope: ActorScope) {
  const conditions = [eq(leads.id, id), isNull(leads.deletedAt)];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.leads.findFirst({
    where: and(...conditions),
    with: {
      assignee: { columns: { id: true, name: true } },
      serviceInterested: { columns: { id: true, name: true } },
      convertedClient: { columns: { id: true, name: true } },
      followups: {
        orderBy: (followup, { desc }) => [desc(followup.followedUpAt)],
        with: { user: { columns: { id: true, name: true } } },
      },
    },
  });
}

/** actor is null for the public API — those leads have no staff creator, only an optional auto-assignee. */
export async function createLead(input: LeadInput, actor: ActorScope | null) {
  return db.transaction(async (tx) => {
    let assignedTo = enforceAssignment(input.assignedTo, actor);

    if (!assignedTo) {
      const autoAssignEnabled = await getSetting<boolean>(LEAD_AUTO_ASSIGNMENT_KEY, false, tx);
      if (autoAssignEnabled) {
        assignedTo = await pickRoundRobinAssignee(tx, actor);
      }
    }

    const [created] = await tx
      .insert(leads)
      .values({
        ...input,
        assignedTo,
        createdBy: actor?.userId ?? null,
        updatedBy: actor?.userId ?? null,
      })
      .returning();
    if (!created) throw new Error("Failed to create lead");

    await recordActivity(
      {
        actorId: actor?.userId ?? null,
        entityType: "lead",
        entityId: created.id,
        action: "created",
        diff: { ...input, assignedTo },
      },
      tx,
    );

    return created;
  });
}

export async function updateLead(id: string, input: LeadInput, actor: ActorScope) {
  const assignedTo = enforceAssignment(input.assignedTo, actor);

  return db.transaction(async (tx) => {
    const conditions = [eq(leads.id, id), isNull(leads.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(leads)
      .set({ ...input, assignedTo, updatedBy: actor.userId })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "lead",
        entityId: updated.id,
        action: "updated",
        diff: { ...input, assignedTo },
      },
      tx,
    );

    return updated;
  });
}

/** Marking a lead "won" happens only through convertLeadToClient, never a bare status update. */
export async function updateLeadStatus(id: string, input: LeadStatusUpdate, actor: ActorScope) {
  if (input.status === "won") {
    throw new Error("Use convertLeadToClient to mark a lead as won.");
  }

  return db.transaction(async (tx) => {
    const conditions = [eq(leads.id, id), isNull(leads.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(leads)
      .set({
        status: input.status,
        lostReason: input.status === "lost" ? input.lostReason : null,
        updatedBy: actor.userId,
      })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "lead",
        entityId: updated.id,
        action: "status_changed",
        diff: { status: input.status, lostReason: updated.lostReason },
      },
      tx,
    );

    return updated;
  });
}

export async function addFollowup(leadId: string, input: LeadFollowupInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const leadConditions = [eq(leads.id, leadId), isNull(leads.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) leadConditions.push(scoped);

    const lead = await tx.query.leads.findFirst({ where: and(...leadConditions) });
    if (!lead) return null;

    const [followup] = await tx
      .insert(leadFollowups)
      .values({
        leadId,
        userId: actor.userId,
        channel: input.channel,
        summary: input.summary,
        nextFollowUpAt: input.nextFollowUpAt,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!followup) throw new Error("Failed to record follow-up");

    await tx
      .update(leads)
      .set({ nextFollowUpAt: input.nextFollowUpAt ?? null, updatedBy: actor.userId })
      .where(eq(leads.id, leadId));

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "lead",
        entityId: leadId,
        action: "followup_logged",
        diff: input,
      },
      tx,
    );

    return followup;
  });
}

export async function deleteLead(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(leads)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "lead", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}

/** Creates or links a client from a lead and marks it won, in one transaction (spec 4.1). */
export async function convertLeadToClient(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const conditions = [
      eq(leads.id, id),
      isNull(leads.deletedAt),
      ne(leads.status, "won"),
      ne(leads.status, "lost"),
    ];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const lead = await tx.query.leads.findFirst({ where: and(...conditions) });
    if (!lead) return null;

    let client = await tx.query.clients.findFirst({ where: eq(clients.phone, lead.phone) });

    if (!client) {
      const [createdClient] = await tx
        .insert(clients)
        .values({
          type: "individual",
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          city: lead.city,
          assignedTo: lead.assignedTo,
          referralSource: lead.source,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      if (!createdClient) throw new Error("Failed to create client");
      client = createdClient;

      await recordActivity(
        {
          actorId: actor.userId,
          entityType: "client",
          entityId: client.id,
          action: "created_from_lead",
          diff: { leadId: lead.id },
        },
        tx,
      );
    }

    const [updatedLead] = await tx
      .update(leads)
      .set({ status: "won", convertedClientId: client.id, updatedBy: actor.userId })
      .where(eq(leads.id, lead.id))
      .returning();
    if (!updatedLead) throw new Error("Failed to mark lead as won");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "lead",
        entityId: lead.id,
        action: "converted",
        diff: { clientId: client.id },
      },
      tx,
    );

    return { lead: updatedLead, client };
  });
}
