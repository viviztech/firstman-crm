import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { serviceCategories, services, serviceVerticals } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { complianceItems } from "@/db/schema/compliance";
import { enquiries } from "@/db/schema/enquiries";
import { invoices, payments } from "@/db/schema/invoices";
import { orders, orderTasks } from "@/db/schema/orders";
import { makeScope } from "@/lib/test-scope";
import { createEnquiry, updateEnquiryStatus } from "@/services/enquiries";
import { createInvoice, recordPayment, sendInvoice } from "@/services/invoices";
import { createOrder, updateOrderStatus } from "@/services/orders";
import {
  getAgingReceivables,
  getComplianceFilingStatus,
  getConversionRateByExecutive,
  getEnquirySourcePerformance,
  getRevenueByService,
  summarizeAgingBuckets,
} from "@/services/reports";

describe("reports service (integration)", () => {
  const managerId = randomUUID();
  const execId = randomUUID();
  const managerScope = makeScope(managerId, "manager");

  let clientId: string;
  let reportsTestServiceId: string;
  let reportsTestCategoryId: string;
  let reportsTestVerticalId: string;

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Reports Test Manager",
        email: `reports-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execId,
        name: "Reports Test Exec",
        email: `reports-exec-${execId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const [vertical] = await db
      .insert(serviceVerticals)
      .values({ name: `Reports Test Vertical ${randomUUID().slice(0, 8)}` })
      .returning();
    if (!vertical) throw new Error("Failed to create test service vertical");
    reportsTestVerticalId = vertical.id;

    const [category] = await db
      .insert(serviceCategories)
      .values({
        verticalId: reportsTestVerticalId,
        name: `Reports Test Category ${randomUUID().slice(0, 8)}`,
      })
      .returning();
    if (!category) throw new Error("Failed to create test service category");
    reportsTestCategoryId = category.id;

    const [service] = await db
      .insert(services)
      .values({
        categoryId: category.id,
        name: "Reports Test Service",
        slug: `reports-test-service-${randomUUID().slice(0, 8)}`,
        basePricePaise: 100000,
        estimatedDays: 7,
        checklistTemplate: [],
        requiredDocuments: [],
      })
      .returning();
    if (!service) throw new Error("Failed to create test service");
    reportsTestServiceId = service.id;

    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Reports Test Client",
        phone: "+919876616099",
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("Failed to create test client");
    clientId = client.id;
  });

  afterAll(async () => {
    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.clientId, clientId));
    for (const o of testOrders) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, o.id));
    }
    await db.delete(orders).where(eq(orders.clientId, clientId));

    const testInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, clientId));
    for (const inv of testInvoices) {
      await db.delete(payments).where(eq(payments.invoiceId, inv.id));
    }
    await db.delete(invoices).where(eq(invoices.clientId, clientId));

    await db.delete(complianceItems).where(eq(complianceItems.clientId, clientId));
    await db.delete(clients).where(eq(clients.id, clientId));
    await db.delete(enquiries).where(ilike(enquiries.phone, "+919876616%"));
    await db.delete(services).where(eq(services.id, reportsTestServiceId));
    await db.delete(serviceCategories).where(eq(serviceCategories.id, reportsTestCategoryId));
    await db.delete(serviceVerticals).where(eq(serviceVerticals.id, reportsTestVerticalId));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execId));
  });

  describe("getEnquirySourcePerformance", () => {
    it("counts enquiries per source, and won/lost/conversionRate correctly", async () => {
      const won = await createEnquiry(
        { name: "Reports Enquiry Won", phone: "+919876616001", source: "referral" },
        managerScope,
      );
      const lost = await createEnquiry(
        { name: "Reports Enquiry Lost", phone: "+919876616002", source: "referral" },
        managerScope,
      );
      await updateEnquiryStatus(
        lost.id,
        { status: "lost", lostReason: "not interested" },
        managerScope,
      );

      const rows = await getEnquirySourcePerformance();
      const referralRow = rows.find((row) => row.source === "referral");
      expect(referralRow).toBeDefined();
      expect(referralRow?.total).toBeGreaterThanOrEqual(2);
      expect(referralRow?.lost).toBeGreaterThanOrEqual(1);
      expect(referralRow?.conversionRate).toBe(
        referralRow ? referralRow.won / referralRow.total : 0,
      );
      expect(won.id).toBeTruthy();
    });
  });

  describe("getConversionRateByExecutive", () => {
    it("groups enquiries by assigned executive with won count and conversion rate", async () => {
      await createEnquiry(
        {
          name: "Reports Enquiry Exec",
          phone: "+919876616003",
          source: "website",
          assignedTo: execId,
        },
        managerScope,
      );

      const rows = await getConversionRateByExecutive();
      const row = rows.find((r) => r.executiveId === execId);
      expect(row).toBeDefined();
      expect(row?.executiveName).toBe("Reports Test Exec");
      expect(row?.total).toBeGreaterThanOrEqual(1);
      expect(row?.conversionRate).toBe(row ? row.won / row.total : 0);
    });
  });

  describe("getRevenueByService", () => {
    it("sums quoted order revenue per service, excluding cancelled orders", async () => {
      // Uses a dedicated service created just for this test (not the shared seeded catalog)
      // so the sum is exact and unaffected by other test files' orders running concurrently.
      const activeOrder = await createOrder(
        { clientId, serviceId: reportsTestServiceId, quotedPricePaise: 175000 },
        managerScope,
      );
      const cancelledOrder = await createOrder(
        { clientId, serviceId: reportsTestServiceId, quotedPricePaise: 999999 },
        managerScope,
      );
      await updateOrderStatus(cancelledOrder.id, "cancelled", managerScope);

      const rows = await getRevenueByService();
      const row = rows.find((r) => r.serviceId === reportsTestServiceId);
      expect(row?.totalPaise).toBe(activeOrder.quotedPricePaise);
    });
  });

  describe("getAgingReceivables and summarizeAgingBuckets", () => {
    it("buckets open invoices by days past due and nets out partial payments", async () => {
      const invoice = await createInvoice(
        {
          clientId,
          lineItems: [{ description: "aging-test-marker", qty: 1, ratePaise: 400000 }],
          gstRate: 0,
          dueDate: new Date("2026-01-01T00:00:00.000Z"),
        },
        managerScope,
      );
      if (!invoice) throw new Error("setup failed");
      await sendInvoice(invoice.id, managerScope);
      await recordPayment(invoice.id, { amountPaise: 100000, method: "cash" }, managerScope);

      // totalPaise = 400000 (0% GST) - paid 100000 = balance 300000, due 2026-01-01, "now" 2026-02-15 -> 45 days past due -> bucket "31-60"
      const now = new Date("2026-02-15T00:00:00.000Z");
      const rows = await getAgingReceivables(now);
      const row = rows.find((r) => r.invoiceId === invoice.id);
      expect(row).toBeDefined();
      expect(row?.balancePaise).toBe(300000);
      expect(row?.daysPastDue).toBe(45);
      expect(row?.bucket).toBe("31-60");

      const summary = summarizeAgingBuckets(rows);
      const bucketSummary = summary.find((b) => b.bucket === "31-60");
      expect(bucketSummary?.count).toBeGreaterThanOrEqual(1);
      expect(bucketSummary?.totalPaise).toBeGreaterThanOrEqual(300000);
      expect(summary.map((b) => b.bucket)).toEqual(["current", "1-30", "31-60", "61-90", "90+"]);
    });
  });

  describe("getComplianceFilingStatus", () => {
    it("counts compliance items by status", async () => {
      await db.insert(complianceItems).values({
        clientId,
        title: "Reports test compliance item",
        dueDate: new Date("2026-12-31T00:00:00.000Z"),
        recurrence: "none",
        status: "upcoming",
      });

      const rows = await getComplianceFilingStatus();
      const row = rows.find((r) => r.status === "upcoming");
      expect(row?.count).toBeGreaterThanOrEqual(1);
    });
  });
});
