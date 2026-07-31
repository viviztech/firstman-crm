import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { serviceCategories, services } from "@/db/schema/catalog";
import { getPublicCatalog, getPublicServiceBySlug } from "@/services/marketing-catalog";

describe("marketing-catalog service (integration)", () => {
  const marker = `MktCatTest${randomUUID().slice(0, 8)}`;
  let categoryId: string;
  let activeServiceId: string;
  let deletedServiceId: string;
  let deletedCategoryId: string;
  let deletedCategoryServiceId: string;

  beforeAll(async () => {
    const [category] = await db
      .insert(serviceCategories)
      .values({ name: `${marker} Category` })
      .returning();
    if (!category) throw new Error("Failed to create test category");
    categoryId = category.id;

    const [activeService] = await db
      .insert(services)
      .values({
        categoryId,
        name: `${marker} Recurring Service`,
        slug: `${marker.toLowerCase()}-recurring`,
        description: "A recurring public test service",
        basePricePaise: 250000,
        govtFeePaise: 50000,
        estimatedDays: 5,
        isRecurring: true,
        recurrence: "yearly",
        checklistTemplate: [{ title: "Internal step", dayOffset: 1 }],
        requiredDocuments: ["PAN card", "Address proof"],
      })
      .returning();
    if (!activeService) throw new Error("Failed to create test service");
    activeServiceId = activeService.id;

    const [deletedService] = await db
      .insert(services)
      .values({
        categoryId,
        name: `${marker} Deleted Service`,
        slug: `${marker.toLowerCase()}-deleted`,
        basePricePaise: 100000,
        estimatedDays: 3,
        checklistTemplate: [],
        requiredDocuments: [],
        deletedAt: new Date(),
      })
      .returning();
    if (!deletedService) throw new Error("Failed to create deleted test service");
    deletedServiceId = deletedService.id;

    const [deletedCategory] = await db
      .insert(serviceCategories)
      .values({ name: `${marker} Deleted Category`, deletedAt: new Date() })
      .returning();
    if (!deletedCategory) throw new Error("Failed to create deleted test category");
    deletedCategoryId = deletedCategory.id;

    const [deletedCategoryService] = await db
      .insert(services)
      .values({
        categoryId: deletedCategoryId,
        name: `${marker} Orphaned Service`,
        slug: `${marker.toLowerCase()}-orphaned`,
        basePricePaise: 100000,
        estimatedDays: 3,
        checklistTemplate: [],
        requiredDocuments: [],
      })
      .returning();
    if (!deletedCategoryService) throw new Error("Failed to create orphaned test service");
    deletedCategoryServiceId = deletedCategoryService.id;
  });

  afterAll(async () => {
    await db.delete(services).where(eq(services.id, activeServiceId));
    await db.delete(services).where(eq(services.id, deletedServiceId));
    await db.delete(services).where(eq(services.id, deletedCategoryServiceId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, categoryId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, deletedCategoryId));
  });

  describe("getPublicCatalog", () => {
    it("includes active categories with their non-deleted services, projected to public fields", async () => {
      const catalog = await getPublicCatalog();
      const category = catalog.find((c) => c.id === categoryId);
      expect(category).toBeDefined();
      expect(category?.services.map((s) => s.id)).toContain(activeServiceId);
      expect(category?.services.map((s) => s.id)).not.toContain(deletedServiceId);

      const service = category?.services.find((s) => s.id === activeServiceId);
      expect(service).toMatchObject({
        slug: `${marker.toLowerCase()}-recurring`,
        name: `${marker} Recurring Service`,
        basePricePaise: 250000,
        govtFeePaise: 50000,
        estimatedDays: 5,
        isRecurring: true,
        recurrence: "yearly",
        requiredDocuments: ["PAN card", "Address proof"],
      });
    });

    it("excludes soft-deleted categories entirely", async () => {
      const catalog = await getPublicCatalog();
      expect(catalog.map((c) => c.id)).not.toContain(deletedCategoryId);
    });
  });

  describe("getPublicServiceBySlug", () => {
    it("returns the service with its category name for a valid, non-deleted slug", async () => {
      const result = await getPublicServiceBySlug(`${marker.toLowerCase()}-recurring`);
      expect(result).toMatchObject({
        id: activeServiceId,
        categoryName: `${marker} Category`,
      });
    });

    it("returns null for an unknown slug", async () => {
      const result = await getPublicServiceBySlug("no-such-service-slug");
      expect(result).toBeNull();
    });

    it("returns null for a soft-deleted service", async () => {
      const result = await getPublicServiceBySlug(`${marker.toLowerCase()}-deleted`);
      expect(result).toBeNull();
    });

    it("returns null when the service's category is soft-deleted", async () => {
      const result = await getPublicServiceBySlug(`${marker.toLowerCase()}-orphaned`);
      expect(result).toBeNull();
    });
  });
});
