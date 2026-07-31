import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { complianceItems } from "@/db/schema/compliance";
import { invoices, payments } from "@/db/schema/invoices";
import { leads } from "@/db/schema/leads";
import { orders } from "@/db/schema/orders";
import { sumPaise } from "@/lib/money";

const OPEN_INVOICE_STATUSES = ["sent", "partially_paid", "overdue"] as const;

/** Report: leads and win rate per source (spec 4.9). */
export async function getLeadSourcePerformance() {
  const rows = await db
    .select({
      source: leads.source,
      total: count(),
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')`.mapWith(Number),
      lost: sql<number>`count(*) filter (where ${leads.status} = 'lost')`.mapWith(Number),
    })
    .from(leads)
    .where(isNull(leads.deletedAt))
    .groupBy(leads.source);

  return rows.map((row) => ({
    source: row.source,
    total: row.total,
    won: row.won,
    lost: row.lost,
    conversionRate: row.total > 0 ? row.won / row.total : 0,
  }));
}

/** Report: conversion rate grouped by the executive a lead is assigned to (spec 4.9). */
export async function getConversionRateByExecutive() {
  const rows = await db
    .select({
      executiveId: leads.assignedTo,
      executiveName: user.name,
      total: count(),
      won: sql<number>`count(*) filter (where ${leads.status} = 'won')`.mapWith(Number),
    })
    .from(leads)
    .innerJoin(user, eq(leads.assignedTo, user.id))
    .where(isNull(leads.deletedAt))
    .groupBy(leads.assignedTo, user.name);

  return rows.map((row) => ({
    executiveId: row.executiveId,
    executiveName: row.executiveName,
    total: row.total,
    won: row.won,
    conversionRate: row.total > 0 ? row.won / row.total : 0,
  }));
}

/** Report: order revenue (quoted price) per service, non-cancelled orders (spec 4.9). */
export async function getRevenueByService() {
  const rows = await db
    .select({
      serviceId: orders.serviceId,
      serviceName: services.name,
      orderCount: count(),
      totalPaise: sql<number>`sum(${orders.quotedPricePaise})`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(services, eq(orders.serviceId, services.id))
    .where(and(isNull(orders.deletedAt), sql`${orders.status} != 'cancelled'`))
    .groupBy(orders.serviceId, services.name)
    .orderBy(sql`sum(${orders.quotedPricePaise}) desc`);

  return rows;
}

export type AgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

function bucketForDaysPastDue(daysPastDue: number): AgingBucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

/** Report: open invoices bucketed by how many days past their due date they are (spec 4.9). */
export async function getAgingReceivables(now: Date = new Date()) {
  const openInvoices = await db.query.invoices.findMany({
    where: and(isNull(invoices.deletedAt), inArray(invoices.status, OPEN_INVOICE_STATUSES)),
    columns: { id: true, invoiceNo: true, totalPaise: true, dueDate: true },
    with: { client: { columns: { name: true } } },
  });

  const paymentRows =
    openInvoices.length > 0
      ? await db
          .select({ invoiceId: payments.invoiceId, amountPaise: payments.amountPaise })
          .from(payments)
          .where(
            inArray(
              payments.invoiceId,
              openInvoices.map((invoice) => invoice.id),
            ),
          )
      : [];
  const paidByInvoice = new Map<string, number>();
  for (const row of paymentRows) {
    paidByInvoice.set(row.invoiceId, (paidByInvoice.get(row.invoiceId) ?? 0) + row.amountPaise);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return openInvoices.map((invoice) => {
    const daysPastDue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / dayMs);
    const balancePaise = invoice.totalPaise - (paidByInvoice.get(invoice.id) ?? 0);
    return {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      clientName: invoice.client.name,
      dueDate: invoice.dueDate,
      daysPastDue,
      balancePaise,
      bucket: bucketForDaysPastDue(daysPastDue),
    };
  });
}

/** Summary of getAgingReceivables, grouped by bucket, in bucket order. */
export function summarizeAgingBuckets(
  rows: Awaited<ReturnType<typeof getAgingReceivables>>,
): { bucket: AgingBucket; count: number; totalPaise: number }[] {
  const buckets: AgingBucket[] = ["current", "1-30", "31-60", "61-90", "90+"];
  return buckets.map((bucket) => {
    const inBucket = rows.filter((row) => row.bucket === bucket);
    return {
      bucket,
      count: inBucket.length,
      totalPaise: sumPaise(inBucket.map((row) => row.balancePaise)),
    };
  });
}

/** Report: compliance items grouped by filing status (spec 4.9). */
export async function getComplianceFilingStatus() {
  const rows = await db
    .select({ status: complianceItems.status, count: count() })
    .from(complianceItems)
    .where(isNull(complianceItems.deletedAt))
    .groupBy(complianceItems.status);

  return rows.map((row) => ({ status: row.status, count: row.count }));
}
