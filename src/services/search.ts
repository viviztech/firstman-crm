import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema/clients";
import { invoices } from "@/db/schema/invoices";
import { leads } from "@/db/schema/leads";
import { orders } from "@/db/schema/orders";
import type { ActorScope } from "@/lib/scope";

const RESULT_LIMIT = 5;

export type SearchResult = { id: string; label: string; sublabel: string; href: string };

export type GlobalSearchResults = {
  leads: SearchResult[];
  clients: SearchResult[];
  orders: SearchResult[];
  invoices: SearchResult[];
};

/**
 * cmdk global search palette (spec 4.9) — mirrors each module's own scoping rules exactly
 * (executive assignedTo-only, invoices closed to executives entirely) so search never
 * surfaces a record the caller couldn't otherwise open.
 */
export async function globalSearch(scope: ActorScope, query: string): Promise<GlobalSearchResults> {
  const term = query.trim();
  if (term.length < 2) {
    return { leads: [], clients: [], orders: [], invoices: [] };
  }
  const like = `%${term}%`;

  const canSeeLeads = scope.role !== "accountant";
  const canSeeInvoices = scope.role !== "executive";
  const executiveOnly = scope.role === "executive";

  const [leadRows, clientRows, orderRows, invoiceRows] = await Promise.all([
    canSeeLeads
      ? db
          .select({ id: leads.id, name: leads.name, phone: leads.phone })
          .from(leads)
          .where(
            and(
              isNull(leads.deletedAt),
              or(ilike(leads.name, like), ilike(leads.phone, like)),
              executiveOnly ? eq(leads.assignedTo, scope.userId) : undefined,
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
          executiveOnly ? eq(clients.assignedTo, scope.userId) : undefined,
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
          executiveOnly ? eq(orders.assignedTo, scope.userId) : undefined,
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
    leads: leadRows.map((row) => ({
      id: row.id,
      label: row.name,
      sublabel: row.phone,
      href: `/leads/${row.id}`,
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
