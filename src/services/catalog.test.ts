import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import {
  serviceCategories,
  servicePriceHistory,
  serviceRelations,
  services,
} from "@/db/schema/catalog";
import { makeScope } from "@/lib/test-scope";
import {
  createService,
  createServiceCategory,
  deleteServiceCategory,
  listServicePriceHistory,
  listServiceRelations,
  serviceInputSchema,
  setServiceRelations,
  updateService,
  updateServiceCategory,
} from "@/services/catalog";

function serviceInput(categoryId: string, overrides: Record<string, unknown> = {}) {
  return serviceInputSchema.parse({
    categoryId,
    name: "Catalog Test Service",
    slug: `catalog-test-service-${randomUUID().slice(0, 8)}`,
    description: "",
    basePricePaise: 100000,
    govtFeePaise: "",
    estimatedDays: 7,
    isRecurring: false,
    recurrence: "",
    checklistTemplate: JSON.stringify([{ title: "Step one", dayOffset: 1 }]),
    requiredDocuments: JSON.stringify(["PAN Card"]),
    ...overrides,
  });
}

describe("catalog service (integration)", () => {
  const managerId = randomUUID();
  const managerScope = makeScope(managerId, "manager");
  let categoryId: string;
  const createdServiceIds: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values({
      id: managerId,
      name: "Catalog Test Manager",
      email: `catalog-manager-${managerId}@test.local`,
      emailVerified: true,
      role: "manager",
    });

    const category = await createServiceCategory(
      { name: `Catalog Test Category ${randomUUID().slice(0, 8)}`, sort: 0 },
      managerScope,
    );
    categoryId = category.id;
  });

  afterAll(async () => {
    for (const id of createdServiceIds) {
      await db.delete(serviceRelations).where(eq(serviceRelations.serviceId, id));
      await db.delete(serviceRelations).where(eq(serviceRelations.relatedServiceId, id));
      await db.delete(servicePriceHistory).where(eq(servicePriceHistory.serviceId, id));
      await db.delete(services).where(eq(services.id, id));
    }
    await db.delete(serviceCategories).where(eq(serviceCategories.id, categoryId));
    await db.delete(user).where(eq(user.id, managerId));
  });

  describe("service category CRUD", () => {
    it("creates and updates a category", async () => {
      const created = await createServiceCategory(
        { name: `Temp Category ${randomUUID().slice(0, 8)}`, sort: 5 },
        managerScope,
      );
      const updated = await updateServiceCategory(
        created.id,
        { name: "Renamed Category", sort: 9 },
        managerScope,
      );
      expect(updated?.name).toBe("Renamed Category");
      expect(updated?.sort).toBe(9);

      const result = await deleteServiceCategory(created.id, managerScope);
      expect(result.ok).toBe(true);
    });

    it("refuses to delete a category that still has active services", async () => {
      const created = await createService(serviceInput(categoryId), managerScope);
      createdServiceIds.push(created.id);

      const result = await deleteServiceCategory(categoryId, managerScope);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/services in this category/i);
      }
    });
  });

  describe("service CRUD + price history", () => {
    it("creates a service without a price history row", async () => {
      const created = await createService(serviceInput(categoryId), managerScope);
      createdServiceIds.push(created.id);

      const history = await listServicePriceHistory(created.id);
      expect(history).toHaveLength(0);
    });

    it("records a price history row when basePricePaise or govtFeePaise changes", async () => {
      const created = await createService(
        serviceInput(categoryId, { basePricePaise: 200000 }),
        managerScope,
      );
      createdServiceIds.push(created.id);

      await updateService(
        created.id,
        serviceInput(categoryId, { basePricePaise: 250000, govtFeePaise: 5000 }),
        managerScope,
      );

      const history = await listServicePriceHistory(created.id);
      expect(history).toHaveLength(1);
      expect(history[0]?.basePricePaise).toBe(250000);
      expect(history[0]?.govtFeePaise).toBe(5000);
    });

    it("does not record a price history row when the price is unchanged", async () => {
      const created = await createService(
        serviceInput(categoryId, { basePricePaise: 300000 }),
        managerScope,
      );
      createdServiceIds.push(created.id);

      await updateService(
        created.id,
        serviceInput(categoryId, { basePricePaise: 300000, name: "Renamed, same price" }),
        managerScope,
      );

      const history = await listServicePriceHistory(created.id);
      expect(history).toHaveLength(0);
    });

    it("orders price history newest first", async () => {
      const created = await createService(
        serviceInput(categoryId, { basePricePaise: 100000 }),
        managerScope,
      );
      createdServiceIds.push(created.id);

      await updateService(
        created.id,
        serviceInput(categoryId, { basePricePaise: 110000 }),
        managerScope,
      );
      await updateService(
        created.id,
        serviceInput(categoryId, { basePricePaise: 120000 }),
        managerScope,
      );

      const history = await listServicePriceHistory(created.id);
      expect(history.map((row) => row.basePricePaise)).toEqual([120000, 110000]);
    });
  });

  describe("service relations", () => {
    it("sets, lists, and replaces the full related-services set", async () => {
      const a = await createService(serviceInput(categoryId), managerScope);
      const b = await createService(serviceInput(categoryId), managerScope);
      const c = await createService(serviceInput(categoryId), managerScope);
      createdServiceIds.push(a.id, b.id, c.id);

      await setServiceRelations(
        a.id,
        [
          { relatedServiceId: b.id, relationType: "upsell" },
          { relatedServiceId: c.id, relationType: "prerequisite" },
        ],
        managerScope,
      );

      let relations = await listServiceRelations(a.id);
      expect(relations).toHaveLength(2);
      expect(relations.map((r) => r.relatedService.id).sort()).toEqual([b.id, c.id].sort());

      // Replace-all: only b should remain
      await setServiceRelations(
        a.id,
        [{ relatedServiceId: b.id, relationType: "renewal" }],
        managerScope,
      );
      relations = await listServiceRelations(a.id);
      expect(relations).toHaveLength(1);
      expect(relations[0]?.relatedServiceId).toBe(b.id);
      expect(relations[0]?.relationType).toBe("renewal");
    });

    it("rejects a service being related to itself", async () => {
      const a = await createService(serviceInput(categoryId), managerScope);
      createdServiceIds.push(a.id);

      const result = await setServiceRelations(
        a.id,
        [{ relatedServiceId: a.id, relationType: "upsell" }],
        managerScope,
      );
      expect(result.ok).toBe(false);
    });
  });
});
