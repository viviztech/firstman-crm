import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { services, serviceVerticals } from "@/db/schema/catalog";

/** See catalog.ts's byNameCaseInsensitive — same cross-environment collation fix. */
const byNameCaseInsensitive = sql`lower(${services.name})`;

/**
 * Public projection of the service catalog for the marketing site — reads the same
 * `services` table the CRM quotes orders from, so a price edited in Settings updates the
 * public pricing page automatically. Internal-only fields (checklistTemplate day offsets,
 * audit columns) are left out; requiredDocuments is kept since "what you'll need" is
 * genuinely useful on a public service page.
 */
export type PublicService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePricePaise: number;
  govtFeePaise: number | null;
  estimatedDays: number;
  isRecurring: boolean;
  recurrence: "monthly" | "quarterly" | "yearly" | null;
  requiredDocuments: string[];
};

export type PublicServiceCategory = {
  id: string;
  name: string;
  services: PublicService[];
};

export type PublicServiceVertical = {
  id: string;
  name: string;
  categories: PublicServiceCategory[];
};

function toPublicService(row: typeof services.$inferSelect): PublicService {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    basePricePaise: row.basePricePaise,
    govtFeePaise: row.govtFeePaise,
    estimatedDays: row.estimatedDays,
    isRecurring: row.isRecurring,
    recurrence: row.recurrence,
    requiredDocuments: row.requiredDocuments,
  };
}

/** Verticals with their public-facing categories and services, ordered for display. */
export async function getPublicCatalog(): Promise<PublicServiceVertical[]> {
  const verticals = await db.query.serviceVerticals.findMany({
    where: isNull(serviceVerticals.deletedAt),
    orderBy: (row, { asc }) => [asc(row.sort)],
    with: {
      categories: {
        where: (row, { isNull: isNullFn }) => isNullFn(row.deletedAt),
        orderBy: (row, { asc }) => [asc(row.sort)],
        with: {
          services: {
            where: (row, { isNull: isNullFn }) => isNullFn(row.deletedAt),
            orderBy: () => [byNameCaseInsensitive],
          },
        },
      },
    },
  });

  return verticals.map((vertical) => ({
    id: vertical.id,
    name: vertical.name,
    categories: vertical.categories.map((category) => ({
      id: category.id,
      name: category.name,
      services: category.services.map(toPublicService),
    })),
  }));
}

/** Flat list of every public-facing service across all verticals/categories — for consumers that just need "all services" rather than the hierarchy (homepage, sitemap, llms.txt, etc.). */
export async function getPublicServices(): Promise<PublicService[]> {
  const rows = await db.query.services.findMany({
    where: isNull(services.deletedAt),
    orderBy: () => [byNameCaseInsensitive],
    with: {
      category: {
        columns: { deletedAt: true },
        with: { vertical: { columns: { deletedAt: true } } },
      },
    },
  });

  return rows
    .filter((row) => !row.category.deletedAt && !row.category.vertical.deletedAt)
    .map(toPublicService);
}

/** A single service by slug, for a service detail page — 404s (returns null) if unpublished. */
export async function getPublicServiceBySlug(
  slug: string,
): Promise<(PublicService & { categoryName: string; verticalName: string }) | null> {
  const row = await db.query.services.findFirst({
    where: and(eq(services.slug, slug), isNull(services.deletedAt)),
    with: { category: { with: { vertical: true } } },
  });
  if (!row || row.category.deletedAt || row.category.vertical.deletedAt) return null;

  return {
    ...toPublicService(row),
    categoryName: row.category.name,
    verticalName: row.category.vertical.name,
  };
}
