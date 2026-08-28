import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema/documents";
import { invoices } from "@/db/schema/invoices";
import { orders } from "@/db/schema/orders";

/**
 * Portal-scoped queries — no `ActorScope` exists for a customer (staff-only concept), so every
 * function here takes a bare `clientId` (from the verified portal session) and is the sole
 * authorization: there is no separate role/territory check layered on top, only "does this row
 * belong to this client." Read-only, per ADR 0009 decision 3.
 */
export async function listOrdersForPortalClient(clientId: string) {
  return db.query.orders.findMany({
    where: and(eq(orders.clientId, clientId), isNull(orders.deletedAt)),
    orderBy: [desc(orders.createdAt)],
    with: {
      service: { columns: { id: true, name: true } },
      tasks: {
        where: (task, { isNull: isNullFn }) => isNullFn(task.deletedAt),
        orderBy: (task, { asc }) => [asc(task.sort)],
        columns: { id: true, title: true, status: true, dueAt: true },
      },
    },
  });
}

export async function listInvoicesForPortalClient(clientId: string) {
  return db.query.invoices.findMany({
    where: and(eq(invoices.clientId, clientId), isNull(invoices.deletedAt)),
    orderBy: [desc(invoices.createdAt)],
    columns: {
      id: true,
      invoiceNo: true,
      kind: true,
      status: true,
      totalPaise: true,
      dueDate: true,
      orderId: true,
    },
  });
}

export async function listDocumentsForPortalClient(clientId: string) {
  const clientOrders = await db.query.orders.findMany({
    where: and(eq(orders.clientId, clientId), isNull(orders.deletedAt)),
    columns: { id: true },
  });
  const ownerIds = [clientId, ...clientOrders.map((order) => order.id)];

  return db.query.documents.findMany({
    where: and(inArray(documents.ownerId, ownerIds), isNull(documents.deletedAt)),
    orderBy: [desc(documents.createdAt)],
  });
}

/** Ownership check for the portal document-download route: must belong to this client, directly or via one of their orders. */
export async function getDocumentForPortalClient(documentId: string, clientId: string) {
  const document = await db.query.documents.findFirst({
    where: and(eq(documents.id, documentId), isNull(documents.deletedAt)),
  });
  if (!document) return null;

  if (document.ownerType === "client") {
    return document.ownerId === clientId ? document : null;
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, document.ownerId), isNull(orders.deletedAt)),
    columns: { clientId: true },
  });
  return order?.clientId === clientId ? document : null;
}
