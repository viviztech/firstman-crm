import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceCategories, services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { complianceItems } from "@/db/schema/compliance";
import { enquiries, enquiryFollowups } from "@/db/schema/enquiries";
import { expenses } from "@/db/schema/expenses";
import { districts, pincodes, states } from "@/db/schema/geography";
import { invoices } from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";
import { CATALOG_SEED } from "@/db/seed-data/catalog";
import { CLIENT_SEED } from "@/db/seed-data/clients";
import { COMPLIANCE_SEED } from "@/db/seed-data/compliance";
import { ENQUIRY_SEED, FOLLOWUP_SEED_INDEXES } from "@/db/seed-data/enquiries";
import { EXPENSE_SEED } from "@/db/seed-data/expenses";
import { parseGeographyCsv, STATE_SEED } from "@/db/seed-data/geography";
import { INVOICE_SEED } from "@/db/seed-data/invoices";
import { ORDER_SEED } from "@/db/seed-data/orders";
import { auth, type Role } from "@/lib/auth";
import { env } from "@/lib/env";
import type { ActorScope } from "@/lib/scope";
import {
  createComplianceItem,
  markComplianceItemFiled,
  rollComplianceStatuses,
} from "@/services/compliance";
import { closeEnquiryAsSale } from "@/services/enquiries";
import { createExpense } from "@/services/expenses";
import {
  cancelInvoice,
  createInvoice,
  recordPayment,
  rollInvoiceStatusesOverdue,
  sendInvoice,
} from "@/services/invoices";
import { createOrder, updateOrderStatus } from "@/services/orders";

/** A couple of seeded enquiries get genuinely closed as sales so conversion-rate reports have non-zero data. */
const WON_ENQUIRY_PHONES = ["+919833100033", "+919900100010"] as const;

/** The seed script always acts as an unrestricted super_admin (ADR 0001's employeeType/pincodes/serviceIds don't apply). */
function actorScope(actorId: string): ActorScope {
  return {
    userId: actorId,
    role: "super_admin",
    employeeType: "internal",
    pincodes: [],
    serviceIds: [],
  };
}

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

const GEOGRAPHY_DISTRICT_CHUNK_SIZE = 500;
const GEOGRAPHY_PINCODE_CHUNK_SIZE = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Seeds the states/districts/pincodes master data. Batched with onConflictDoNothing rather than
 * the row-by-row existence checks the rest of this file uses — at ~24k unique pincodes that
 * pattern would be far too slow, and the batched form is still fully idempotent on reseed.
 */
async function seedGeography(): Promise<void> {
  await db.insert(states).values(STATE_SEED).onConflictDoNothing({ target: states.name });

  const stateRows = await db.select({ id: states.id, name: states.name }).from(states);
  const stateIdByName = new Map(stateRows.map((row) => [row.name, row.id]));

  const csvPath = join(process.cwd(), "src/db/seed-data/geography-source.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const geoRows = parseGeographyCsv(csvText);

  const districtByKey = new Map<string, { stateId: string; name: string }>();
  const skippedStates = new Set<string>();
  for (const row of geoRows) {
    const stateId = stateIdByName.get(row.state);
    if (!stateId) {
      skippedStates.add(row.state);
      continue;
    }
    districtByKey.set(`${stateId}|||${row.district}`, { stateId, name: row.district });
  }

  const districtValues = Array.from(districtByKey.values());
  for (const batch of chunk(districtValues, GEOGRAPHY_DISTRICT_CHUNK_SIZE)) {
    await db
      .insert(districts)
      .values(batch)
      .onConflictDoNothing({ target: [districts.stateId, districts.name] });
  }

  const districtRows = await db
    .select({ id: districts.id, stateId: districts.stateId, name: districts.name })
    .from(districts);
  const districtIdByKey = new Map(
    districtRows.map((row) => [`${row.stateId}|||${row.name}`, row.id]),
  );

  const pincodeValues: { pincode: string; districtId: string; stateId: string; city: string }[] =
    [];
  for (const row of geoRows) {
    const stateId = stateIdByName.get(row.state);
    if (!stateId) continue;
    const districtId = districtIdByKey.get(`${stateId}|||${row.district}`);
    if (!districtId) continue;
    pincodeValues.push({ pincode: row.pincode, districtId, stateId, city: row.city });
  }

  for (const batch of chunk(pincodeValues, GEOGRAPHY_PINCODE_CHUNK_SIZE)) {
    await db.insert(pincodes).values(batch).onConflictDoNothing({ target: pincodes.pincode });
  }

  if (skippedStates.size > 0) {
    console.warn(
      `geography seed: skipped unrecognized state names (not in STATE_SEED): ${[...skippedStates].join(", ")}`,
    );
  }
  console.log(
    `seeded geography: ${STATE_SEED.length} states, ${districtValues.length} districts, ${pincodeValues.length} pincodes`,
  );
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

async function seedEnquiries(actorId: string, executiveIds: string[]): Promise<void> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const [index, seed] of ENQUIRY_SEED.entries()) {
    const existing = await db.query.enquiries.findFirst({ where: eq(enquiries.phone, seed.phone) });
    if (existing) continue;

    const serviceInterested = seed.serviceSlug
      ? await db.query.services.findFirst({ where: eq(services.slug, seed.serviceSlug) })
      : undefined;

    const assignedTo =
      executiveIds.length > 0 ? executiveIds[index % executiveIds.length] : undefined;

    const [created] = await db
      .insert(enquiries)
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
      await db.insert(enquiryFollowups).values({
        enquiryId: created.id,
        userId: assignedTo ?? actorId,
        channel: "call",
        summary: "Initial outreach call — explained services and pricing.",
        followedUpAt: new Date(now - 2 * dayMs),
        createdBy: actorId,
        updatedBy: actorId,
      });
    }
  }
  console.log(`seeded ${ENQUIRY_SEED.length} demo enquiries`);
}

async function seedEnquiryConversions(actorId: string): Promise<void> {
  const actor = actorScope(actorId);

  for (const phone of WON_ENQUIRY_PHONES) {
    const enquiry = await db.query.enquiries.findFirst({ where: eq(enquiries.phone, phone) });
    if (!enquiry || enquiry.status === "won" || !enquiry.serviceInterestedId) continue;

    const service = await db.query.services.findFirst({
      where: eq(services.id, enquiry.serviceInterestedId),
    });
    if (!service) continue;

    await closeEnquiryAsSale(
      enquiry.id,
      {
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email ?? undefined,
        address: undefined,
        pincode: undefined,
        serviceId: service.id,
        quotedPricePaise: service.basePricePaise,
        govtFeePaise: service.govtFeePaise ?? undefined,
        comments: undefined,
      },
      actor,
    );
  }
  console.log(`closed ${WON_ENQUIRY_PHONES.length} demo enquiries as sales`);
}

async function seedOrders(actorId: string, executiveIds: string[]): Promise<void> {
  const actor = actorScope(actorId);

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
  const actor = actorScope(actorId);
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

async function seedInvoices(actorId: string): Promise<void> {
  const actor = actorScope(actorId);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const seed of INVOICE_SEED) {
    const client = await db.query.clients.findFirst({ where: eq(clients.name, seed.clientName) });
    if (!client) continue;

    const firstDescription = seed.lineItems[0]?.description;
    const clientInvoices = await db.query.invoices.findMany({
      where: eq(invoices.clientId, client.id),
    });
    const alreadyExists = clientInvoices.some(
      (invoice) => invoice.lineItems[0]?.description === firstDescription,
    );
    if (alreadyExists) continue;

    const created = await createInvoice(
      {
        clientId: client.id,
        lineItems: seed.lineItems,
        gstRate: seed.gstRate,
        dueDate: new Date(now + seed.dueDateOffsetDays * dayMs),
      },
      actor,
    );
    if (!created) continue;

    if (seed.action === "cancelled") {
      await cancelInvoice(created.id, actor);
      continue;
    }

    if (seed.action === "sent") {
      await sendInvoice(created.id, actor);
    }

    for (const payment of seed.payments ?? []) {
      await recordPayment(
        created.id,
        { amountPaise: payment.amountPaise, method: payment.method, reference: payment.reference },
        actor,
      );
    }
  }

  await rollInvoiceStatusesOverdue();
  console.log(`seeded ${INVOICE_SEED.length} demo invoices`);
}

async function seedExpenses(actorId: string): Promise<void> {
  const actor = actorScope(actorId);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const seed of EXPENSE_SEED) {
    const existing = await db.query.expenses.findFirst({
      where: and(eq(expenses.category, seed.category), eq(expenses.amountPaise, seed.amountPaise)),
    });
    if (existing) continue;

    let order: { id: string } | undefined;
    if (seed.orderClientName && seed.orderServiceSlug) {
      const orderClient = await db.query.clients.findFirst({
        where: eq(clients.name, seed.orderClientName),
      });
      const orderService = await db.query.services.findFirst({
        where: eq(services.slug, seed.orderServiceSlug),
      });
      if (orderClient && orderService) {
        order = await db.query.orders.findFirst({
          where: and(eq(orders.clientId, orderClient.id), eq(orders.serviceId, orderService.id)),
        });
      }
    }

    await createExpense(
      {
        date: new Date(now + seed.dateOffsetDays * dayMs),
        category: seed.category,
        description: seed.description,
        amountPaise: seed.amountPaise,
        orderId: order?.id,
      },
      actor,
    );
  }
  console.log(`seeded ${EXPENSE_SEED.length} demo expenses`);
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

  await seedGeography();
  await seedCatalog(adminId);
  await seedClients(adminId, executiveIds);
  await seedEnquiries(adminId, executiveIds);
  await seedEnquiryConversions(adminId);
  await seedOrders(adminId, executiveIds);
  await seedCompliance(adminId);
  await seedInvoices(adminId);
  await seedExpenses(adminId);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
