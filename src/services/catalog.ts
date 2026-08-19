import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  recurrenceEnum,
  serviceCategories,
  servicePriceHistory,
  serviceRelations,
  serviceRelationTypeEnum,
  services,
  serviceVerticals,
} from "@/db/schema/catalog";
import type { ActorScope } from "@/lib/scope";
import { optionalTrimmed } from "@/lib/validation/helpers";
import { recordActivity } from "@/services/activity-log";

/**
 * `lower(name)` rather than `services.name` directly — Postgres's default text ordering
 * depends on the database's collation, which differs by OS/install (e.g. this repo's local
 * Windows Postgres sorts "Import…" before "ISO…"/"ITR…" case-insensitively, while a fresh
 * `postgres:16-alpine` container's default "C" locale sorts by raw byte value, putting
 * "ISO"/"ITR" — all-caps — before lowercase-continuing "Import"). Ordering by the lowercased
 * value is deterministic across every environment.
 */
const byNameCaseInsensitive = sql`lower(${services.name})`;
const byCategoryNameCaseInsensitive = sql`lower(${serviceCategories.name})`;
const byVerticalNameCaseInsensitive = sql`lower(${serviceVerticals.name})`;

function parseJsonArray<T>(schema: z.ZodType<T>) {
  return z.preprocess((value) => {
    if (typeof value !== "string" || value === "") return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }, z.array(schema));
}

export const serviceVerticalInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(200),
  sort: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().int()),
});

export type ServiceVerticalInput = z.infer<typeof serviceVerticalInputSchema>;

export const serviceCategoryInputSchema = z.object({
  verticalId: z.string().uuid("Choose a vertical"),
  name: z.string().trim().min(2, "Name is required").max(200),
  sort: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().int()),
});

export type ServiceCategoryInput = z.infer<typeof serviceCategoryInputSchema>;

export const serviceInputSchema = z
  .object({
    categoryId: z.string().uuid("Choose a category"),
    name: z.string().trim().min(2, "Name is required").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(150)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
    description: optionalTrimmed(2000),
    basePricePaise: z.coerce.number().int().nonnegative(),
    govtFeePaise: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().nonnegative().optional(),
    ),
    estimatedDays: z.coerce.number().int().positive(),
    isRecurring: z.preprocess((v) => v === "true" || v === true, z.boolean()),
    recurrence: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(recurrenceEnum.enumValues).optional(),
    ),
    checklistTemplate: parseJsonArray(
      z.object({
        title: z.string().trim().min(1, "Title is required"),
        dayOffset: z.coerce.number().int().nonnegative(),
      }),
    ),
    requiredDocuments: parseJsonArray(z.string().trim().min(1)),
  })
  .refine((data) => !data.isRecurring || !!data.recurrence, {
    message: "Choose a recurrence for a recurring service",
    path: ["recurrence"],
  });

export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const serviceRelationInputSchema = z.object({
  relatedServiceId: z.string().uuid(),
  relationType: z.enum(serviceRelationTypeEnum.enumValues),
});

export const serviceRelationsInputSchema = parseJsonArray(serviceRelationInputSchema);

export type ServiceRelationInput = z.infer<typeof serviceRelationInputSchema>;

/** Verticals with their non-deleted categories and those categories' non-deleted services, ordered for display. */
export async function listCatalog() {
  return db.query.serviceVerticals.findMany({
    where: isNull(serviceVerticals.deletedAt),
    orderBy: (verticals, { asc }) => [asc(verticals.sort)],
    with: {
      categories: {
        where: (categories, { isNull: isNullFn }) => isNullFn(categories.deletedAt),
        orderBy: (categories, { asc }) => [asc(categories.sort)],
        with: {
          services: {
            where: (services, { isNull: isNullFn }) => isNullFn(services.deletedAt),
            orderBy: () => [byNameCaseInsensitive],
          },
        },
      },
    },
  });
}

export async function listVerticalOptions() {
  return db
    .select({ id: serviceVerticals.id, name: serviceVerticals.name })
    .from(serviceVerticals)
    .where(isNull(serviceVerticals.deletedAt))
    .orderBy(byVerticalNameCaseInsensitive);
}

/** Category options with their vertical name, for grouped display in the service form's select. */
export async function listServiceCategoryOptions() {
  return db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      verticalName: serviceVerticals.name,
    })
    .from(serviceCategories)
    .innerJoin(serviceVerticals, eq(serviceCategories.verticalId, serviceVerticals.id))
    .where(isNull(serviceCategories.deletedAt))
    .orderBy(byVerticalNameCaseInsensitive, byCategoryNameCaseInsensitive);
}

/** Minimal {id, name} list for select dropdowns (e.g. enquiry "service interested" field). */
export async function listServiceOptions() {
  return db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(isNull(services.deletedAt))
    .orderBy(byNameCaseInsensitive);
}

/** Pricing/turnaround fields the order form pre-fills when a service is selected. */
export async function listServicesForOrders() {
  return db
    .select({
      id: services.id,
      name: services.name,
      basePricePaise: services.basePricePaise,
      govtFeePaise: services.govtFeePaise,
      estimatedDays: services.estimatedDays,
    })
    .from(services)
    .where(isNull(services.deletedAt))
    .orderBy(byNameCaseInsensitive);
}

export async function getServiceById(id: string) {
  return db.query.services.findFirst({ where: eq(services.id, id) });
}

export async function createServiceVertical(input: ServiceVerticalInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(serviceVerticals)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create service vertical");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_vertical",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

export async function updateServiceVertical(
  id: string,
  input: ServiceVerticalInput,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(serviceVerticals)
      .set({ ...input, updatedBy: actor.userId })
      .where(and(eq(serviceVerticals.id, id), isNull(serviceVerticals.deletedAt)))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_vertical",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

/** Refuses (friendly error, not a raw FK exception) if the vertical still has active categories. */
export async function deleteServiceVertical(
  id: string,
  actor: ActorScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    const activeCategory = await tx.query.serviceCategories.findFirst({
      where: and(eq(serviceCategories.verticalId, id), isNull(serviceCategories.deletedAt)),
      columns: { id: true },
    });
    if (activeCategory) {
      return {
        ok: false,
        error: "Move or delete the categories in this vertical first.",
      } as const;
    }

    const [deleted] = await tx
      .update(serviceVerticals)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(serviceVerticals.id, id), isNull(serviceVerticals.deletedAt)))
      .returning();
    if (!deleted) return { ok: false, error: "Vertical not found." } as const;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_vertical",
        entityId: deleted.id,
        action: "deleted",
      },
      tx,
    );

    return { ok: true } as const;
  });
}

export async function createServiceCategory(input: ServiceCategoryInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(serviceCategories)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create service category");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_category",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

export async function updateServiceCategory(
  id: string,
  input: ServiceCategoryInput,
  actor: ActorScope,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(serviceCategories)
      .set({ ...input, updatedBy: actor.userId })
      .where(and(eq(serviceCategories.id, id), isNull(serviceCategories.deletedAt)))
      .returning();
    if (!updated) return null;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_category",
        entityId: updated.id,
        action: "updated",
        diff: input,
      },
      tx,
    );

    return updated;
  });
}

/** Refuses (friendly error, not a raw FK exception) if the category still has active services. */
export async function deleteServiceCategory(
  id: string,
  actor: ActorScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.transaction(async (tx) => {
    const activeService = await tx.query.services.findFirst({
      where: and(eq(services.categoryId, id), isNull(services.deletedAt)),
      columns: { id: true },
    });
    if (activeService) {
      return {
        ok: false,
        error: "Move or delete the services in this category first.",
      } as const;
    }

    const [deleted] = await tx
      .update(serviceCategories)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(serviceCategories.id, id), isNull(serviceCategories.deletedAt)))
      .returning();
    if (!deleted) return { ok: false, error: "Category not found." } as const;

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service_category",
        entityId: deleted.id,
        action: "deleted",
      },
      tx,
    );

    return { ok: true } as const;
  });
}

export async function createService(input: ServiceInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(services)
      .values({ ...input, createdBy: actor.userId, updatedBy: actor.userId })
      .returning();
    if (!created) throw new Error("Failed to create service");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service",
        entityId: created.id,
        action: "created",
        diff: input,
      },
      tx,
    );

    return created;
  });
}

/** Updates a service, versioning basePricePaise/govtFeePaise into service_price_history only when either actually changes. */
export async function updateService(id: string, input: ServiceInput, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.services.findFirst({
      where: and(eq(services.id, id), isNull(services.deletedAt)),
    });
    if (!existing) return null;

    const priceChanged =
      existing.basePricePaise !== input.basePricePaise ||
      existing.govtFeePaise !== (input.govtFeePaise ?? null);

    if (priceChanged) {
      await tx.insert(servicePriceHistory).values({
        serviceId: id,
        basePricePaise: input.basePricePaise,
        govtFeePaise: input.govtFeePaise,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
    }

    const [updated] = await tx
      .update(services)
      .set({ ...input, updatedBy: actor.userId })
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .returning();
    if (!updated) throw new Error("Failed to update service");

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service",
        entityId: updated.id,
        action: "updated",
        diff: { ...input, priceChanged },
      },
      tx,
    );

    return updated;
  });
}

export async function deleteService(id: string, actor: ActorScope) {
  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .update(services)
      .set({ deletedAt: new Date(), updatedBy: actor.userId })
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .returning();
    if (!deleted) return null;

    await recordActivity(
      { actorId: actor.userId, entityType: "service", entityId: deleted.id, action: "deleted" },
      tx,
    );

    return deleted;
  });
}

/** Newest first. */
export async function listServicePriceHistory(serviceId: string) {
  return db.query.servicePriceHistory.findMany({
    where: eq(servicePriceHistory.serviceId, serviceId),
    orderBy: [desc(servicePriceHistory.createdAt)],
  });
}

/** Relations *from* this service, each with the related service's summary fields. */
export async function listServiceRelations(serviceId: string) {
  return db.query.serviceRelations.findMany({
    where: eq(serviceRelations.serviceId, serviceId),
    with: {
      relatedService: { columns: { id: true, name: true, basePricePaise: true } },
    },
  });
}

/**
 * Replace-all — the edit form always submits the full current set, not incremental add/remove
 * calls, same pattern as setStaffServiceAssignments (src/services/staff.ts).
 */
export async function setServiceRelations(
  serviceId: string,
  relations: ServiceRelationInput[],
  actor: ActorScope,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (relations.some((relation) => relation.relatedServiceId === serviceId)) {
    return { ok: false, error: "A service can't be related to itself." };
  }

  const deduped = new Map(relations.map((relation) => [relation.relatedServiceId, relation]));

  return db.transaction(async (tx) => {
    await tx.delete(serviceRelations).where(eq(serviceRelations.serviceId, serviceId));
    if (deduped.size > 0) {
      await tx.insert(serviceRelations).values(
        Array.from(deduped.values()).map((relation) => ({
          serviceId,
          relatedServiceId: relation.relatedServiceId,
          relationType: relation.relationType,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    }

    await recordActivity(
      {
        actorId: actor.userId,
        entityType: "service",
        entityId: serviceId,
        action: "relations_updated",
        diff: { relations },
      },
      tx,
    );

    return { ok: true } as const;
  });
}
