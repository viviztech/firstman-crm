import { endOfDay } from "date-fns";
import { and, asc, count, eq, ilike, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import {
  enquiries,
  enquiryFollowupChannelEnum,
  enquiryFollowupHandoffEnum,
  enquiryFollowups,
  enquirySourceEnum,
  enquiryStatusEnum,
} from "@/db/schema/enquiries";
import { staffPincodeAllocations, staffProfiles, staffServiceAssignments } from "@/db/schema/staff";
import type { ActorScope } from "@/lib/scope";
import { visibilityConditions } from "@/lib/scope";
import {
  optionalDateTime,
  optionalEmailSchema,
  optionalTrimmed,
  optionalUuid,
  pincodeSchema,
} from "@/lib/validation/helpers";
import { indianPhoneSchema } from "@/lib/validation/phone";
import { recordActivity } from "@/services/activity-log";
import { createProformaInvoiceInTx } from "@/services/invoices";
import { createOrderInTx, type Transaction } from "@/services/orders";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

/** GST rate applied to the auto-generated proforma invoice when a sale is closed. */
const DEFAULT_SALE_GST_RATE_KEY = "defaultGstRate";

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  phone: indianPhoneSchema,
  email: optionalEmailSchema,
  address: optionalTrimmed(500),
  city: optionalTrimmed(100),
  pincode: pincodeSchema,
  source: z.enum(enquirySourceEnum.enumValues),
  serviceInterestedId: optionalUuid,
  assignedTo: optionalTrimmed(),
  referralPartnerId: optionalUuid,
  nextFollowUpAt: optionalDateTime,
  notes: optionalTrimmed(2000),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

/** Public API enquiries never carry an internal assignee — round-robin/manual assignment is a staff-only concern. */
export const publicEnquiryInputSchema = enquiryInputSchema.omit({ assignedTo: true });

export type PublicEnquiryInput = z.infer<typeof publicEnquiryInputSchema>;

export const enquiryStatusUpdateSchema = z
  .object({
    status: z.enum(enquiryStatusEnum.enumValues),
    lostReason: optionalTrimmed(500),
  })
  .refine((data) => data.status !== "lost" || !!data.lostReason, {
    message: "A reason is required when marking an enquiry as lost",
    path: ["lostReason"],
  });

export type EnquiryStatusUpdate = z.infer<typeof enquiryStatusUpdateSchema>;

/** Sales screen: reviews/edits contact details, picks a service + price, converts to client + order in one step. */
export const closeEnquiryAsSaleInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  phone: indianPhoneSchema,
  email: optionalEmailSchema,
  address: optionalTrimmed(500),
  state: optionalTrimmed(100),
  pincode: pincodeSchema,
  serviceId: z.string().uuid("Choose a service"),
  quotedPricePaise: z.coerce.number().int().nonnegative(),
  govtFeePaise: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().nonnegative().optional(),
  ),
  comments: optionalTrimmed(2000),
});

export type CloseEnquiryAsSaleInput = z.infer<typeof closeEnquiryAsSaleInputSchema>;

/** Followup screen: log the next follow-up and optionally hand it to another executive. */
export const enquiryFollowupInputSchema = z
  .object({
    channel: z.enum(enquiryFollowupChannelEnum.enumValues).default("call"),
    summary: z.string().trim().min(2, "Summary is required").max(1000),
    nextFollowUpAt: optionalDateTime,
    handoffType: z.enum(enquiryFollowupHandoffEnum.enumValues).default("self"),
    handoffTo: optionalTrimmed(),
  })
  .refine((data) => data.handoffType === "self" || !!data.handoffTo, {
    message: "Choose who this follow-up should be handed to",
    path: ["handoffTo"],
  });

export type EnquiryFollowupInput = z.infer<typeof enquiryFollowupInputSchema>;

const PAGE_SIZE = 20;
export const ENQUIRY_AUTO_ASSIGNMENT_KEY = "enquiryAutoAssignment";
const ENQUIRY_ROUND_ROBIN_CURSOR_KEY = "enquiryRoundRobinCursor";

export async function isEnquiryAutoAssignmentEnabled(): Promise<boolean> {
  return getSetting<boolean>(ENQUIRY_AUTO_ASSIGNMENT_KEY, false);
}

/**
 * Executives only ever see/act on enquiries in scope — internal-type by assignedTo, franchise-type
 * by pincode territory, both further narrowed by service assignment if configured (spec 3, ADR 0001).
 */
function scopeCondition(scope: ActorScope) {
  return visibilityConditions(scope, {
    assignedToColumn: enquiries.assignedTo,
    pincodeColumn: enquiries.pincode,
    serviceIdColumn: enquiries.serviceInterestedId,
  });
}

/** Internal-type executives can't assign enquiries to anyone but themselves; franchise-type staff
 * (territory-shared) only get defaulted to themselves when nothing was submitted (ADR 0001). */
function enforceAssignment(assignedTo: string | undefined, actor: ActorScope | null) {
  if (actor?.role === "executive" && actor.employeeType === "internal") {
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

/** Franchise-type executives whose allocated territory covers `pincode`, stably ordered. */
async function franchiseCandidatesForPincode(tx: Transaction, pincode: string): Promise<string[]> {
  const rows = await tx
    .select({ id: staffProfiles.userId })
    .from(staffProfiles)
    .innerJoin(
      staffPincodeAllocations,
      eq(staffPincodeAllocations.staffProfileId, staffProfiles.id),
    )
    .where(
      and(
        eq(staffProfiles.employeeType, "franchise"),
        eq(staffPincodeAllocations.pincode, pincode),
      ),
    )
    .orderBy(asc(staffProfiles.userId));
  return rows.map((row) => row.id);
}

/** Executives who are not franchise-type (no staff_profiles row defaults to internal), stably ordered. */
async function internalCandidates(tx: Transaction): Promise<string[]> {
  const franchiseRows = await tx
    .select({ id: staffProfiles.userId })
    .from(staffProfiles)
    .where(eq(staffProfiles.employeeType, "franchise"));
  const franchiseIds = new Set(franchiseRows.map((row) => row.id));

  const executives = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "executive"))
    .orderBy(asc(user.id));

  return executives.map((row) => row.id).filter((id) => !franchiseIds.has(id));
}

/**
 * Narrows a candidate pool to staff assigned to `serviceId` — staff with no service-assignment
 * rows at all stay eligible for every service (unrestricted default, ADR 0001).
 */
async function filterByServiceAssignment(
  tx: Transaction,
  candidateIds: string[],
  serviceId: string,
): Promise<string[]> {
  if (candidateIds.length === 0) return candidateIds;

  const assignmentRows = await tx
    .select({
      userId: staffServiceAssignments.userId,
      serviceId: staffServiceAssignments.serviceId,
    })
    .from(staffServiceAssignments)
    .where(inArray(staffServiceAssignments.userId, candidateIds));

  const assignedToThisService = new Set(
    assignmentRows.filter((row) => row.serviceId === serviceId).map((row) => row.userId),
  );
  const hasAnyAssignment = new Set(assignmentRows.map((row) => row.userId));

  return candidateIds.filter((id) => assignedToThisService.has(id) || !hasAnyAssignment.has(id));
}

/**
 * Picks the next round-robin assignee for a new enquiry. Pool selection (ADR 0001): a franchise
 * whose territory covers the enquiry's pincode gets first refusal; otherwise the pool is internal
 * executives. Either pool is then narrowed to staff assigned the enquiry's service, if any staff in
 * the pool have explicit service assignments configured. Each distinct pool gets its own rotation
 * cursor so, e.g., a busy pincode's rotation doesn't starve the general internal rotation.
 */
async function pickRoundRobinAssignee(
  tx: Transaction,
  actor: ActorScope | null,
  enquiry: { pincode?: string | null; serviceInterestedId?: string | null },
): Promise<string | undefined> {
  const franchisePool = enquiry.pincode
    ? await franchiseCandidatesForPincode(tx, enquiry.pincode)
    : [];
  let pool = franchisePool;
  let poolKey = `franchise:${enquiry.pincode}`;
  if (franchisePool.length === 0) {
    pool = await internalCandidates(tx);
    poolKey = "internal";
  }

  if (enquiry.serviceInterestedId) {
    pool = await filterByServiceAssignment(tx, pool, enquiry.serviceInterestedId);
    poolKey = `${poolKey}:service:${enquiry.serviceInterestedId}`;
  }

  if (pool.length === 0) return undefined;

  const cursorKey = `${ENQUIRY_ROUND_ROBIN_CURSOR_KEY}:${poolKey}`;
  const lastAssigned = await getSettingForUpdate<string | null>(cursorKey, null, tx);
  const next = nextInRoundRobin(pool, lastAssigned);
  if (!next) return undefined;

  await setSetting(cursorKey, next, actor, tx);
  return next;
}

export async function listEnquiries(
  scope: ActorScope,
  opts: { page?: number; search?: string; status?: string; source?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [isNull(enquiries.deletedAt), ne(enquiries.status, "lost")];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);
  if (opts.search) {
    const term = `%${opts.search}%`;
    const searchCondition = or(ilike(enquiries.name, term), ilike(enquiries.phone, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (opts.status)
    conditions.push(
      eq(enquiries.status, opts.status as (typeof enquiryStatusEnum.enumValues)[number]),
    );
  if (opts.source)
    conditions.push(
      eq(enquiries.source, opts.source as (typeof enquirySourceEnum.enumValues)[number]),
    );
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.enquiries.findMany({
      where,
      orderBy: (enquiry, { desc }) => [desc(enquiry.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        assignee: { columns: { id: true, name: true } },
        serviceInterested: { columns: { id: true, name: true } },
      },
    }),
    db.select({ total: count() }).from(enquiries).where(where),
  ]);

  return { rows, total: totalRows[0]?.total ?? 0, page, pageSize: PAGE_SIZE };
}

/** All non-deleted, non-lost enquiries in scope, unpaginated — the kanban board groups these client-side by status. */
export async function listEnquiriesForBoard(scope: ActorScope) {
  const conditions = [isNull(enquiries.deletedAt), ne(enquiries.status, "lost")];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.enquiries.findMany({
    where: and(...conditions),
    orderBy: (enquiry, { desc }) => [desc(enquiry.createdAt)],
    with: { assignee: { columns: { id: true, name: true } } },
  });
}

/** A `lost` enquiry (or a soft-deleted one) is invisible here for every role — same 404 as a deleted row. */
export async function getEnquiry(id: string, scope: ActorScope) {
  const conditions = [
    eq(enquiries.id, id),
    isNull(enquiries.deletedAt),
    ne(enquiries.status, "lost"),
  ];
  const scoped = scopeCondition(scope);
  if (scoped) conditions.push(scoped);

  return db.query.enquiries.findFirst({
    where: and(...conditions),
    with: {
      assignee: { columns: { id: true, name: true } },
      nextFollowUpAssignee: { columns: { id: true, name: true } },
      serviceInterested: { columns: { id: true, name: true } },
      convertedClient: { columns: { id: true, name: true } },
      followups: {
        orderBy: (followup, { desc }) => [desc(followup.followedUpAt)],
        with: {
          user: { columns: { id: true, name: true } },
          handoffToUser: { columns: { id: true, name: true } },
        },
      },
    },
  });
}

/** Unscoped fetch for notification jobs — system-context, not a user request (mirrors getInvoiceForPdf). */
export async function getEnquiryForNotification(id: string) {
  return db.query.enquiries.findFirst({
    where: and(eq(enquiries.id, id), isNull(enquiries.deletedAt), ne(enquiries.status, "lost")),
    columns: { id: true, name: true, phone: true },
    with: { assignee: { columns: { id: true, name: true, email: true } } },
  });
}

/**
 * A given executive's enquiries with a follow-up due today or overdue — morning digest cron
 * (spec 4.8). Matches whoever currently owns the pending follow-up: either explicitly handed off
 * (`nextFollowUpAssignedTo`), or the enquiry's own owner when no handoff is in effect.
 */
export async function listFollowUpsDueForExecutive(executiveId: string, now: Date = new Date()) {
  return db.query.enquiries.findMany({
    where: and(
      isNull(enquiries.deletedAt),
      ne(enquiries.status, "lost"),
      or(
        eq(enquiries.nextFollowUpAssignedTo, executiveId),
        and(isNull(enquiries.nextFollowUpAssignedTo), eq(enquiries.assignedTo, executiveId)),
      ),
      isNotNull(enquiries.nextFollowUpAt),
      lte(enquiries.nextFollowUpAt, endOfDay(now)),
    ),
    columns: { id: true, name: true, phone: true, nextFollowUpAt: true },
    orderBy: (enquiry, { asc }) => [asc(enquiry.nextFollowUpAt)],
  });
}

/** All enquiries marked lost — the only view allowed to see them, for the admin purge screen (§4). */
export async function listLostEnquiries() {
  return db.query.enquiries.findMany({
    where: and(isNull(enquiries.deletedAt), eq(enquiries.status, "lost")),
    orderBy: (enquiry, { desc }) => [desc(enquiry.updatedAt)],
    with: {
      assignee: { columns: { id: true, name: true } },
      serviceInterested: { columns: { id: true, name: true } },
    },
  });
}

/** actor is null for the public API — those enquiries have no staff creator, only an optional auto-assignee. */
export async function createEnquiry(input: EnquiryInput, actor: ActorScope | null) {
  return db.transaction(async (tx) => {
    let assignedTo = enforceAssignment(input.assignedTo, actor);

    if (!assignedTo) {
      const autoAssignEnabled = await getSetting<boolean>(ENQUIRY_AUTO_ASSIGNMENT_KEY, false, tx);
      if (autoAssignEnabled) {
        assignedTo = await pickRoundRobinAssignee(tx, actor, {
          pincode: input.pincode,
          serviceInterestedId: input.serviceInterestedId,
        });
      }
    }

    const [created] = await tx
      .insert(enquiries)
      .values({
        ...input,
        assignedTo,
        createdBy: actor?.userId ?? null,
        updatedBy: actor?.userId ?? null,
      })
      .returning();
    if (!created) throw new Error("Failed to create enquiry");

    await recordActivity(
      {
        actorId: actor?.userId ?? null,
        entityType: "enquiry",
        entityId: created.id,
        action: "created",
        diff: { ...input, assignedTo },
      },
      tx,
    );

    return created;
  });
}

export async function updateEnquiry(id: string, input: EnquiryInput, actor: ActorScope) {
  const assignedTo = enforceAssignment(input.assignedTo, actor);

  return db.transaction(async (tx) => {
    const conditions = [eq(enquiries.id, id), isNull(enquiries.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(enquiries)
      .set({ ...input, assignedTo, updatedBy: actor.userId })
      .where(and(...conditions))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "enquiry",
        entityId: updated.id,
        action: "updated",
        diff: { ...input, assignedTo },
      },
      tx,
    );

    return updated;
  });
}

/** Marking an enquiry "won" happens only through closeEnquiryAsSale, never a bare status update. */
export async function updateEnquiryStatus(
  id: string,
  input: EnquiryStatusUpdate,
  actor: ActorScope,
) {
  if (input.status === "won") {
    throw new Error("Use the Sales action to mark an enquiry as won.");
  }

  return db.transaction(async (tx) => {
    const conditions = [eq(enquiries.id, id), isNull(enquiries.deletedAt)];
    const scoped = scopeCondition(actor);
    if (scoped) conditions.push(scoped);

    const [updated] = await tx
      .update(enquiries)
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
        entityType: "enquiry",
        entityId: updated.id,
        action: "status_changed",
        diff: { status: input.status, lostReason: updated.lostReason },
      },
      tx,
    );

    return updated;
  });
}

export async function addFollowup(
  enquiryId: string,
  input: EnquiryFollowupInput,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const enquiryConditions = [
      eq(enquiries.id, enquiryId),
      isNull(enquiries.deletedAt),
      ne(enquiries.status, "lost"),
    ];
    const scoped = scopeCondition(actor);
    if (scoped) enquiryConditions.push(scoped);

    const enquiry = await tx.query.enquiries.findFirst({ where: and(...enquiryConditions) });
    if (!enquiry) return null;

    const handoffTo = input.handoffType === "self" ? null : (input.handoffTo ?? null);

    const [followup] = await tx
      .insert(enquiryFollowups)
      .values({
        enquiryId,
        userId: actor.userId,
        channel: input.channel,
        summary: input.summary,
        nextFollowUpAt: input.nextFollowUpAt,
        handoffType: input.handoffType,
        handoffTo,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (!followup) throw new Error("Failed to record follow-up");

    // One-time handoffs move only the pending follow-up; permanent handoffs move ownership itself.
    const nextFollowUpAssignedTo = input.handoffType === "one_time" ? handoffTo : null;
    const assignedTo =
      input.handoffType === "permanent" && handoffTo ? handoffTo : enquiry.assignedTo;

    await tx
      .update(enquiries)
      .set({
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        nextFollowUpAssignedTo,
        assignedTo,
        updatedBy: actor.userId,
      })
      .where(eq(enquiries.id, enquiryId));

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "enquiry",
        entityId: enquiryId,
        action: "followup_logged",
        diff: input,
      },
      tx,
    );

    return followup;
  });
}

export async function deleteEnquiry(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(enquiries)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(enquiries.id, id), isNull(enquiries.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "enquiry", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}

/** Permanently erases a lost enquiry (cascades its follow-ups) — super_admin only, no soft-delete recovery. */
export async function hardDeleteEnquiry(id: string, actor: ActorScope) {
  if (actor.role !== "super_admin") {
    throw new Error("Only super admins can permanently delete an enquiry.");
  }

  return db.transaction(async (tx) => {
    const [deleted] = await tx.delete(enquiries).where(eq(enquiries.id, id)).returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "enquiry", entityId: id, action: "purged" },
      tx,
    );

    return deleted;
  });
}

/** Creates or links a client from an enquiry and marks it won, in one transaction (spec 4.1). */
async function convertEnquiryToClientInTx(
  tx: Transaction,
  id: string,
  actor: ActorScope,
  contact: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    state?: string;
    pincode?: string;
  },
) {
  const conditions = [
    eq(enquiries.id, id),
    isNull(enquiries.deletedAt),
    ne(enquiries.status, "won"),
    ne(enquiries.status, "lost"),
  ];
  const scoped = scopeCondition(actor);
  if (scoped) conditions.push(scoped);

  const enquiry = await tx.query.enquiries.findFirst({ where: and(...conditions) });
  if (!enquiry) return null;

  let client = await tx.query.clients.findFirst({ where: eq(clients.phone, contact.phone) });

  if (!client) {
    const [createdClient] = await tx
      .insert(clients)
      .values({
        type: "individual",
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        city: enquiry.city,
        state: contact.state,
        pincode: contact.pincode,
        assignedTo: enquiry.assignedTo,
        referralSource: enquiry.source,
        referralPartnerId: enquiry.referralPartnerId,
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
        action: "created_from_enquiry",
        diff: { enquiryId: enquiry.id },
      },
      tx,
    );
  }

  const [updatedEnquiry] = await tx
    .update(enquiries)
    .set({ status: "won", convertedClientId: client.id, updatedBy: actor.userId })
    .where(eq(enquiries.id, enquiry.id))
    .returning();
  if (!updatedEnquiry) throw new Error("Failed to mark enquiry as won");

  await recordActivity(
    {
      actorId: actor.userId,
      entityType: "enquiry",
      entityId: enquiry.id,
      action: "converted",
      diff: { clientId: client.id },
    },
    tx,
  );

  return { enquiry: updatedEnquiry, client };
}

/**
 * The Sales action: reviews/corrects contact details, picks a service + price, and — in one
 * transaction — converts the enquiry into a client and creates its first order (composes
 * `convertEnquiryToClientInTx` with `createOrderInTx` from services/orders.ts).
 */
export async function closeEnquiryAsSale(
  id: string,
  input: CloseEnquiryAsSaleInput,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const conversion = await convertEnquiryToClientInTx(tx, id, actor, {
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      state: input.state,
      pincode: input.pincode,
    });
    if (!conversion) return null;

    const service = await tx.query.services.findFirst({ where: eq(services.id, input.serviceId) });
    if (!service) throw new Error("Service not found");

    const order = await createOrderInTx(
      tx,
      {
        clientId: conversion.client.id,
        serviceId: input.serviceId,
        quotedPricePaise: input.quotedPricePaise,
        govtFeePaise: input.govtFeePaise,
        assignedTo: conversion.enquiry.assignedTo ?? undefined,
        notes: input.comments,
      },
      actor,
    );

    // Spec extension: closing a sale issues the job's proforma invoice (an advance-payment
    // request, not a fiscal document) alongside its order — the final tax invoice only follows
    // once the order is completed and this proforma is paid in full (generateFinalInvoiceIfEligibleInTx).
    const gstRate = await getSetting<number>(DEFAULT_SALE_GST_RATE_KEY, 18, tx);
    const lineItems = [
      { description: service.name, qty: 1, ratePaise: input.quotedPricePaise },
      ...(input.govtFeePaise
        ? [{ description: "Government fee", qty: 1, ratePaise: input.govtFeePaise }]
        : []),
    ];
    const proformaInvoice = await createProformaInvoiceInTx(
      tx,
      { clientId: conversion.client.id, orderId: order.id, lineItems, gstRate },
      actor,
    );

    const [updatedEnquiry] = await tx
      .update(enquiries)
      .set({ convertedOrderId: order.id, updatedBy: actor.userId })
      .where(eq(enquiries.id, id))
      .returning();

    return {
      enquiry: updatedEnquiry ?? conversion.enquiry,
      client: conversion.client,
      order,
      proformaInvoice,
    };
  });
}
