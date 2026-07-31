import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { serviceCategories, services } from "@/db/schema/catalog";

/**
 * `lower(name)` rather than `services.name` directly — Postgres's default text ordering
 * depends on the database's collation, which differs by OS/install (e.g. this repo's local
 * Windows Postgres sorts "Import…" before "ISO…"/"ITR…" case-insensitively, while a fresh
 * `postgres:16-alpine` container's default "C" locale sorts by raw byte value, putting
 * "ISO"/"ITR" — all-caps — before lowercase-continuing "Import"). Ordering by the lowercased
 * value is deterministic across every environment.
 */
const byNameCaseInsensitive = sql`lower(${services.name})`;

/** Categories with their non-deleted services, ordered for display. */
export async function listCatalog() {
  return db.query.serviceCategories.findMany({
    where: isNull(serviceCategories.deletedAt),
    orderBy: (categories, { asc }) => [asc(categories.sort)],
    with: {
      services: {
        where: (services, { isNull: isNullFn }) => isNullFn(services.deletedAt),
        orderBy: () => [byNameCaseInsensitive],
      },
    },
  });
}

/** Minimal {id, name} list for select dropdowns (e.g. lead "service interested" field). */
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
