import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceCategories, services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { complianceItems } from "@/db/schema/compliance";
import { expenses } from "@/db/schema/expenses";
import { invoices } from "@/db/schema/invoices";
import { leadFollowups, leads } from "@/db/schema/leads";
import { orders } from "@/db/schema/orders";
import { CATALOG_SEED } from "@/db/seed-data/catalog";
import { CLIENT_SEED } from "@/db/seed-data/clients";
import { COMPLIANCE_SEED } from "@/db/seed-data/compliance";
import { EXPENSE_SEED } from "@/db/seed-data/expenses";
import { INVOICE_SEED } from "@/db/seed-data/invoices";
import { FOLLOWUP_SEED_INDEXES, LEAD_SEED } from "@/db/seed-data/leads";
import { ORDER_SEED } from "@/db/seed-data/orders";
import { auth, type Role } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  createComplianceItem,
  markComplianceItemFiled,
  rollComplianceStatuses,
} from "@/services/compliance";
import { createExpense } from "@/services/expenses";
import {
  cancelInvoice,
  createInvoice,
  recordPayment,
  rollInvoiceStatusesOverdue,
  sendInvoice,
} from "@/services/invoices";
import { convertLeadToClient } from "@/services/leads";
import { createOrder, updateOrderStatus } from "@/services/orders";

/** A couple of seeded leads get genuinely converted so conversion-rate reports have non-zero data. */
const WON_LEAD_PHONES = ["+919833100033", "+919900100010"] as const;

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

async function seedLeadConversions(actorId: string): Promise<void> {
  const actor = { userId: actorId, role: "super_admin" as const };

  for (const phone of WON_LEAD_PHONES) {
    const lead = await db.query.leads.findFirst({ where: eq(leads.phone, phone) });
    if (!lead || lead.status === "won") continue;

    await convertLeadToClient(lead.id, actor);
  }
  console.log(`converted ${WON_LEAD_PHONES.length} demo leads to won/client`);
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

async function seedInvoices(actorId: string): Promise<void> {
  const actor = { userId: actorId, role: "super_admin" as const };
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
  const actor = { userId: actorId, role: "super_admin" as const };
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

  await seedCatalog(adminId);
  await seedClients(adminId, executiveIds);
  await seedLeads(adminId, executiveIds);
  await seedLeadConversions(adminId);
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
