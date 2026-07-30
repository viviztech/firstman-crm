import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { serviceCategories, services } from "@/db/schema/catalog";

/** Categories with their non-deleted services, ordered for display. */
export async function listCatalog() {
  return db.query.serviceCategories.findMany({
    where: isNull(serviceCategories.deletedAt),
    orderBy: (categories, { asc }) => [asc(categories.sort)],
    with: {
      services: {
        where: (services, { isNull: isNullFn }) => isNullFn(services.deletedAt),
        orderBy: (services, { asc }) => [asc(services.name)],
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
    .orderBy(services.name);
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
    .orderBy(services.name);
}

export async function getServiceById(id: string) {
  return db.query.services.findFirst({ where: eq(services.id, id) });
}
