import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { serviceCategories, services, serviceVerticals } from "@/db/schema/catalog";
import {
  getPublicCatalog,
  getPublicServiceBySlug,
  getPublicServices,
  getRelatedServices,
} from "@/services/marketing-catalog";

describe("marketing-catalog service (integration)", () => {
  const marker = `MktCatTest${randomUUID().slice(0, 8)}`;
  let verticalId: string;
  let categoryId: string;
  let activeServiceId: string;
  let siblingServiceId: string;
  let deletedServiceId: string;
  let deletedCategoryId: string;
  let deletedCategoryServiceId: string;

  beforeAll(async () => {
    const [vertical] = await db
      .insert(serviceVerticals)
      .values({ name: `${marker} Vertical` })
      .returning();
    if (!vertical) throw new Error("Failed to create test vertical");
    verticalId = vertical.id;

    const [category] = await db
      .insert(serviceCategories)
      .values({ verticalId, name: `${marker} Category` })
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

    const [siblingService] = await db
      .insert(services)
      .values({
        categoryId,
        name: `${marker} Sibling Service`,
        slug: `${marker.toLowerCase()}-sibling`,
        basePricePaise: 150000,
        estimatedDays: 4,
        checklistTemplate: [],
        requiredDocuments: [],
      })
      .returning();
    if (!siblingService) throw new Error("Failed to create sibling test service");
    siblingServiceId = siblingService.id;

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
      .values({ verticalId, name: `${marker} Deleted Category`, deletedAt: new Date() })
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
    await db.delete(services).where(eq(services.id, siblingServiceId));
    await db.delete(services).where(eq(services.id, deletedServiceId));
    await db.delete(services).where(eq(services.id, deletedCategoryServiceId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, categoryId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, deletedCategoryId));
    await db.delete(serviceVerticals).where(eq(serviceVerticals.id, verticalId));
  });

  describe("getPublicCatalog", () => {
    it("includes active categories with their non-deleted services, projected to public fields", async () => {
      const catalog = await getPublicCatalog();
      const vertical = catalog.find((v) => v.id === verticalId);
      expect(vertical).toBeDefined();

      const category = vertical?.categories.find((c) => c.id === categoryId);
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
      const vertical = catalog.find((v) => v.id === verticalId);
      expect(vertical?.categories.map((c) => c.id)).not.toContain(deletedCategoryId);
    });
  });

  describe("getPublicServices", () => {
    it("includes non-deleted services across categories and excludes soft-deleted ones", async () => {
      const allServices = await getPublicServices();
      const ids = allServices.map((s) => s.id);
      expect(ids).toContain(activeServiceId);
      expect(ids).not.toContain(deletedServiceId);
      expect(ids).not.toContain(deletedCategoryServiceId);
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

  describe("getRelatedServices", () => {
    it("returns other active services in the same category, excluding the given slug", async () => {
      const related = await getRelatedServices(categoryId, `${marker.toLowerCase()}-recurring`);
      const ids = related.map((s) => s.id);
      expect(ids).toContain(siblingServiceId);
      expect(ids).not.toContain(activeServiceId);
      expect(ids).not.toContain(deletedServiceId);
    });

    it("returns an empty array for a category with no services", async () => {
      const related = await getRelatedServices(randomUUID(), "no-such-slug");
      expect(related).toEqual([]);
    });
  });
});
