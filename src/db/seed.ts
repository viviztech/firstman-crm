import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceCategories, services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { complianceItems } from "@/db/schema/compliance";
import { leadFollowups, leads } from "@/db/schema/leads";
import { orders } from "@/db/schema/orders";
import { CATALOG_SEED } from "@/db/seed-data/catalog";
import { CLIENT_SEED } from "@/db/seed-data/clients";
import { COMPLIANCE_SEED } from "@/db/seed-data/compliance";
import { FOLLOWUP_SEED_INDEXES, LEAD_SEED } from "@/db/seed-data/leads";
import { ORDER_SEED } from "@/db/seed-data/orders";
import { auth, type Role } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  createComplianceItem,
  markComplianceItemFiled,
  rollComplianceStatuses,
} from "@/services/compliance";
import { createOrder, updateOrderStatus } from "@/services/orders";

const STAFF: { role: Role; count: number }[] = [
  { role: "manager", count: 3 },
  { role: "executive", count: 3 },
  { role: "accountant", count: 3 },
];

async function upsertUser(email: string, name: string, role: Role): Promise<string> {
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });

  if (existing) {
    await db.update(user).set({ role }).where(eq(user.id, existing.id));
    console.log(`updated role for ${email} -> ${role}`);
    return existing.id;
  }

  const result = await auth.api.signUpEmail({
    body: { email, password: env.ADMIN_DEFAULT_PASSWORD, name },
  });
  await db.update(user).set({ role }).where(eq(user.id, result.user.id));
  console.log(`created ${email} -> ${role}`);
  return result.user.id;
}

async function seedCatalog(actorId: string): Promise<void> {
  for (const category of CATALOG_SEED) {
    let categoryRow = await db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.name, category.name),
    });

    if (!categoryRow) {
      const [created] = await db
        .insert(serviceCategories)
        .values({
          name: category.name,
          sort: category.sort,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning();
      if (!created) throw new Error(`Failed to create category ${category.name}`);
      categoryRow = created;
      console.log(`created category ${category.name}`);
    }

    for (const service of category.services) {
      const existing = await db.query.services.findFirst({
        where: eq(services.slug, service.slug),
      });
      const values = {
        categoryId: categoryRow.id,
        name: service.name,
        slug: service.slug,
        description: service.description,
        basePricePaise: service.basePricePaise,
        govtFeePaise: service.govtFeePaise ?? null,
        estimatedDays: service.estimatedDays,
        isRecurring: service.isRecurring,
        recurrence: service.recurrence ?? null,
        checklistTemplate: service.checklistTemplate,
        requiredDocuments: service.requiredDocuments,
        updatedBy: actorId,
      };

      if (existing) {
        await db.update(services).set(values).where(eq(services.id, existing.id));
      } else {
        await db.insert(services).values({ ...values, createdBy: actorId });
        console.log(`created service ${service.name}`);
      }
    }
  }
}

async function seedClients(actorId: string, executiveIds: string[]): Promise<void> {
  for (const [index, seed] of CLIENT_SEED.entries()) {
    const existing = await db.query.clients.findFirst({ where: eq(clients.phone, seed.phone) });
    if (existing) continue;

    const assignedTo =
      executiveIds.length > 0 ? executiveIds[index % executiveIds.length] : undefined;

    await db.insert(clients).values({
      type: seed.type,
      name: seed.name,
      businessName: seed.businessName,
      phone: seed.phone,
      email: seed.email,
      gstin: seed.gstin,
      pan: seed.pan,
      address: seed.address,
      city: seed.city,
      state: seed.state,
      pincode: seed.pincode,
      referralSource: seed.referralSource,
      assignedTo,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }
  console.log(`seeded ${CLIENT_SEED.length} demo clients`);
}

async function seedLeads(actorId: string, executiveIds: string[]): Promise<void> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const [index, seed] of LEAD_SEED.entries()) {
    const existing = await db.query.leads.findFirst({ where: eq(leads.phone, seed.phone) });
    if (existing) continue;

    const serviceInterested = seed.serviceSlug
      ? await db.query.services.findFirst({ where: eq(services.slug, seed.serviceSlug) })
      : undefined;

    const assignedTo =
      executiveIds.length > 0 ? executiveIds[index % executiveIds.length] : undefined;

    const [created] = await db
      .insert(leads)
      .values({
        name: seed.name,
        phone: seed.phone,
        email: seed.email,
        city: seed.city,
        source: seed.source,
        status: seed.status,
        lostReason: seed.lostReason,
        serviceInterestedId: serviceInterested?.id,
        notes: seed.notes,
        assignedTo,
        nextFollowUpAt:
          seed.nextFollowUpOffsetDays === undefined
            ? undefined
            : new Date(now + seed.nextFollowUpOffsetDays * dayMs),
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    if (!created) continue;

    if ((FOLLOWUP_SEED_INDEXES as readonly number[]).includes(index)) {
      await db.insert(leadFollowups).values({
        leadId: created.id,
        userId: assignedTo ?? actorId,
        channel: "call",
        summary: "Initial outreach call — explained services and pricing.",
        followedUpAt: new Date(now - 2 * dayMs),
        createdBy: actorId,
        updatedBy: actorId,
      });
    }
  }
  console.log(`seeded ${LEAD_SEED.length} demo leads`);
}

async function seedOrders(actorId: string, executiveIds: string[]): Promise<void> {
  const actor = { userId: actorId, role: "super_admin" as const };

  for (const [index, seed] of ORDER_SEED.entries()) {
    const client = await db.query.clients.findFirst({ where: eq(clients.name, seed.clientName) });
    const service = await db.query.services.findFirst({
      where: eq(services.slug, seed.serviceSlug),
    });
    if (!client || !service) continue;

    const existing = await db.query.orders.findFirst({
      where: and(eq(orders.clientId, client.id), eq(orders.serviceId, service.id)),
    });
    if (existing) continue;

    const assignedTo =
      executiveIds.length > 0 ? executiveIds[index % executiveIds.length] : undefined;

    const created = await createOrder(
      {
        clientId: client.id,
        serviceId: service.id,
        quotedPricePaise: service.basePricePaise,
        govtFeePaise: service.govtFeePaise ?? undefined,
        assignedTo,
        notes: undefined,
        startedAt: undefined,
      },
      actor,
    );

    if (seed.status) {
      await updateOrderStatus(created.id, seed.status, actor);
    }
  }
  console.log(`seeded ${ORDER_SEED.length} demo orders`);
}

async function seedCompliance(actorId: string): Promise<void> {
  const actor = { userId: actorId, role: "super_admin" as const };
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const seed of COMPLIANCE_SEED) {
    const client = await db.query.clients.findFirst({ where: eq(clients.name, seed.clientName) });
    if (!client) continue;

    const existing = await db.query.complianceItems.findFirst({
      where: and(eq(complianceItems.clientId, client.id), eq(complianceItems.title, seed.title)),
    });
    if (existing) continue;

    const service = seed.serviceSlug
      ? await db.query.services.findFirst({ where: eq(services.slug, seed.serviceSlug) })
      : undefined;

    const created = await createComplianceItem(
      {
        clientId: client.id,
        serviceId: service?.id,
        title: seed.title,
        description: seed.description,
        dueDate: new Date(now + seed.dueDateOffsetDays * dayMs),
        recurrence: seed.recurrence,
      },
      actor,
    );
    if (!created) continue;

    if (seed.markFiled) {
      await markComplianceItemFiled(created.id, actor);
    }
  }

  await rollComplianceStatuses();
  console.log(`seeded ${COMPLIANCE_SEED.length} demo compliance items`);
}

async function main(): Promise<void> {
  const adminId = await upsertUser("admin@firstman.in", "Admin", "super_admin");

  const executiveIds: string[] = [];
  for (const group of STAFF) {
    for (let i = 1; i <= group.count; i++) {
      const email = `${group.role}${i}@firstman.in`;
      const id = await upsertUser(email, `${group.role} ${i}`, group.role);
      if (group.role === "executive") executiveIds.push(id);
    }
  }

  await seedCatalog(adminId);
  await seedClients(adminId, executiveIds);
  await seedLeads(adminId, executiveIds);
  await seedOrders(adminId, executiveIds);
  await seedCompliance(adminId);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
