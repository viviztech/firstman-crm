import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { serviceCategories, services } from "@/db/schema/catalog";

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

/** Categories with their public-facing services, ordered for display. */
export async function getPublicCatalog(): Promise<PublicServiceCategory[]> {
  const categories = await db.query.serviceCategories.findMany({
    where: isNull(serviceCategories.deletedAt),
    orderBy: (row, { asc }) => [asc(row.sort)],
    with: {
      services: {
        where: (row, { isNull: isNullFn }) => isNullFn(row.deletedAt),
        orderBy: (row, { asc }) => [asc(row.name)],
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    services: category.services.map(toPublicService),
  }));
}

/** A single service by slug, for a service detail page — 404s (returns null) if unpublished. */
export async function getPublicServiceBySlug(
  slug: string,
): Promise<(PublicService & { categoryName: string }) | null> {
  const row = await db.query.services.findFirst({
    where: and(eq(services.slug, slug), isNull(services.deletedAt)),
    with: { category: true },
  });
  if (!row || row.category.deletedAt) return null;

  return { ...toPublicService(row), categoryName: row.category.name };
}
