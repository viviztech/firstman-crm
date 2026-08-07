import { and, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { enquiries } from "@/db/schema/enquiries";
import { invoices } from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";
import type { ActorScope } from "@/lib/scope";
import { visibilityConditions } from "@/lib/scope";

const RESULT_LIMIT = 5;

export type SearchResult = { id: string; label: string; sublabel: string; href: string };

export type GlobalSearchResults = {
  enquiries: SearchResult[];
  clients: SearchResult[];
  orders: SearchResult[];
  invoices: SearchResult[];
};

/**
 * cmdk global search palette (spec 4.9) — mirrors each module's own scoping rules exactly
 * (executive assignedTo-only, invoices closed to executives entirely) so search never
 * surfaces a record the caller couldn't otherwise open. Lost enquiries are hidden everywhere,
 * search included.
 */
export async function globalSearch(scope: ActorScope, query: string): Promise<GlobalSearchResults> {
  const term = query.trim();
  if (term.length < 2) {
    return { enquiries: [], clients: [], orders: [], invoices: [] };
  }
  const like = `%${term}%`;

  const canSeeEnquiries = scope.role !== "accountant";
  const canSeeInvoices = scope.role !== "executive";

  const [enquiryRows, clientRows, orderRows, invoiceRows] = await Promise.all([
    canSeeEnquiries
      ? db
          .select({ id: enquiries.id, name: enquiries.name, phone: enquiries.phone })
          .from(enquiries)
          .where(
            and(
              isNull(enquiries.deletedAt),
              ne(enquiries.status, "lost"),
              or(ilike(enquiries.name, like), ilike(enquiries.phone, like)),
              visibilityConditions(scope, {
                assignedToColumn: enquiries.assignedTo,
                pincodeColumn: enquiries.pincode,
                serviceIdColumn: enquiries.serviceInterestedId,
              }),
            ),
          )
          .limit(RESULT_LIMIT)
      : Promise.resolve([]),
    db
      .select({ id: clients.id, name: clients.name, phone: clients.phone })
      .from(clients)
      .where(
        and(
          isNull(clients.deletedAt),
          or(ilike(clients.name, like), ilike(clients.phone, like)),
          visibilityConditions(scope, {
            assignedToColumn: clients.assignedTo,
            pincodeColumn: clients.pincode,
          }),
        ),
      )
      .limit(RESULT_LIMIT),
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        clientName: clients.name,
      })
      .from(orders)
      .innerJoin(clients, eq(orders.clientId, clients.id))
      .where(
        and(
          isNull(orders.deletedAt),
          or(ilike(orders.orderNo, like), ilike(clients.name, like)),
          visibilityConditions(scope, {
            assignedToColumn: orders.assignedTo,
            pincodeColumn: clients.pincode,
            serviceIdColumn: orders.serviceId,
          }),
        ),
      )
      .limit(RESULT_LIMIT),
    canSeeInvoices
      ? db
          .select({
            id: invoices.id,
            invoiceNo: invoices.invoiceNo,
            clientName: clients.name,
          })
          .from(invoices)
          .innerJoin(clients, eq(invoices.clientId, clients.id))
          .where(
            and(
              isNull(invoices.deletedAt),
              or(ilike(invoices.invoiceNo, like), ilike(clients.name, like)),
            ),
          )
          .limit(RESULT_LIMIT)
      : Promise.resolve([]),
  ]);

  return {
    enquiries: enquiryRows.map((row) => ({
      id: row.id,
      label: row.name,
      sublabel: row.phone,
      href: `/enquiries/${row.id}`,
    })),
    clients: clientRows.map((row) => ({
      id: row.id,
      label: row.name,
      sublabel: row.phone,
      href: `/clients/${row.id}`,
    })),
    orders: orderRows.map((row) => ({
      id: row.id,
      label: row.orderNo,
      sublabel: row.clientName,
      href: `/orders/${row.id}`,
    })),
    invoices: invoiceRows.map((row) => ({
      id: row.id,
      label: row.invoiceNo,
      sublabel: row.clientName,
      href: `/invoices/${row.id}`,
    })),
  };
}
