import { randomUUID } from "node:crypto";
import { and, eq, ilike } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { services } from "@/db/schema/catalog";
import { clients } from "@/db/schema/clients";
import { documents } from "@/db/schema/documents";
import { orders, orderTasks } from "@/db/schema/orders";
import { localStorageDriver } from "@/lib/storage/local";
import {
  attachDocumentFile,
  createClientDocument,
  getDocument,
  getDocumentForDownload,
  listDocumentsForOwner,
  rejectDocument,
  verifyDocument,
} from "@/services/documents";
import { createOrder } from "@/services/orders";

const PDF_BYTES = Buffer.from("%PDF-1.4\ntest content");

describe("documents service (integration)", () => {
  const managerId = randomUUID();
  const execAId = randomUUID();
  const execBId = randomUUID();

  const managerScope = { userId: managerId, role: "manager" as const };
  const execAScope = { userId: execAId, role: "executive" as const };
  const execBScope = { userId: execBId, role: "executive" as const };

  let pvtLtdServiceId: string;
  const savedKeys: string[] = [];

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: managerId,
        name: "Doc Test Manager",
        email: `doc-manager-${managerId}@test.local`,
        emailVerified: true,
        role: "manager",
      },
      {
        id: execAId,
        name: "Doc Test Exec A",
        email: `doc-execA-${execAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: execBId,
        name: "Doc Test Exec B",
        email: `doc-execB-${execBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);

    const service = await db.query.services.findFirst({
      where: eq(services.slug, "pvt-ltd-registration"),
    });
    if (!service) throw new Error("Seed catalog first — pvt-ltd-registration service not found");
    pvtLtdServiceId = service.id;
  });

  afterAll(async () => {
    const testDocs = await db
      .select({ id: documents.id, path: documents.path })
      .from(documents)
      .where(ilike(documents.label, "doc-test-marker%"));
    for (const doc of testDocs) {
      if (doc.path) await localStorageDriver.delete(doc.path).catch(() => undefined);
    }
    for (const key of savedKeys) {
      await localStorageDriver.delete(key).catch(() => undefined);
    }
    await db.delete(documents).where(ilike(documents.label, "doc-test-marker%"));

    const testOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(ilike(orders.notes, "doc-test-marker%"));
    for (const o of testOrders) {
      await db.delete(orderTasks).where(eq(orderTasks.orderId, o.id));
      await db
        .delete(documents)
        .where(and(eq(documents.ownerType, "order"), eq(documents.ownerId, o.id)));
    }
    await db.delete(orders).where(ilike(orders.notes, "doc-test-marker%"));
    await db.delete(clients).where(ilike(clients.phone, "+919876603%"));
    await db.delete(user).where(eq(user.id, managerId));
    await db.delete(user).where(eq(user.id, execAId));
    await db.delete(user).where(eq(user.id, execBId));
  });

  async function makeClient(phone: string, assignedTo?: string) {
    const [client] = await db
      .insert(clients)
      .values({
        type: "individual",
        name: "Doc Test Client",
        phone,
        assignedTo,
        createdBy: managerId,
      })
      .returning();
    if (!client) throw new Error("Failed to create test client");
    return client;
  }

  it("creates an ad-hoc client document with an attached file, scoped to the executive's own client", async () => {
    const client = await makeClient("+919876603001", execAId);

    const created = await createClientDocument(
      { ownerType: "client", ownerId: client.id, kind: "pan_card", label: "doc-test-marker PAN" },
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    expect(created).not.toBeNull();
    expect(created?.status).toBe("received");
    expect(created?.path).toBeTruthy();
    if (created?.path) savedKeys.push(created.path);

    const stored = await localStorageDriver.read(created?.path as string);
    expect(stored.equals(PDF_BYTES)).toBe(true);

    const listed = await listDocumentsForOwner("client", client.id);
    expect(listed.map((d) => d.id)).toContain(created?.id);
  });

  it("blocks an executive from creating a document for a client not assigned to them", async () => {
    const client = await makeClient("+919876603002", execBId);

    const created = await createClientDocument(
      { ownerType: "client", ownerId: client.id, kind: "other", label: "doc-test-marker blocked" },
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    expect(created).toBeNull();
  });

  it("attaches a file to an order's auto-generated checklist item and marks it received", async () => {
    const client = await makeClient("+919876603003", execAId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "doc-test-marker attach",
      },
      managerScope,
    );

    const checklist = await listDocumentsForOwner("order", order.id);
    const target = checklist[0];
    if (!target) throw new Error("expected a generated document checklist item");
    expect(target.status).toBe("pending");
    expect(target.path).toBeNull();

    const attached = await attachDocumentFile(
      target.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    expect(attached?.status).toBe("received");
    expect(attached?.path).toBeTruthy();
    if (attached?.path) savedKeys.push(attached.path);
  });

  it("verifies a received document, and refuses to verify one with no file yet", async () => {
    const client = await makeClient("+919876603004", execAId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "doc-test-marker verify",
      },
      managerScope,
    );
    const checklist = await listDocumentsForOwner("order", order.id);
    const pendingItem = checklist[0];
    if (!pendingItem) throw new Error("expected a generated document checklist item");

    const refused = await verifyDocument(pendingItem.id, managerScope);
    expect(refused).toBeNull();

    const attached = await attachDocumentFile(
      pendingItem.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    if (attached?.path) savedKeys.push(attached.path);

    const verified = await verifyDocument(pendingItem.id, managerScope);
    expect(verified?.status).toBe("verified");
  });

  it("rejects a document with a reason, and re-attaching a file clears the rejection", async () => {
    const client = await makeClient("+919876603005", execAId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "doc-test-marker reject",
      },
      managerScope,
    );
    const checklist = await listDocumentsForOwner("order", order.id);
    const item = checklist[0];
    if (!item) throw new Error("expected a generated document checklist item");

    const attached = await attachDocumentFile(
      item.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    if (attached?.path) savedKeys.push(attached.path);

    const rejected = await rejectDocument(item.id, "Blurry scan", managerScope);
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.rejectReason).toBe("Blurry scan");

    const reattached = await attachDocumentFile(
      item.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    if (reattached?.path) savedKeys.push(reattached.path);
    expect(reattached?.status).toBe("received");
    expect(reattached?.rejectReason).toBeNull();
  });

  it("blocks an executive from attaching/verifying/rejecting a document on an order not assigned to them", async () => {
    const client = await makeClient("+919876603007", execBId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execBId,
        notes: "doc-test-marker cross-owner",
      },
      managerScope,
    );
    const checklist = await listDocumentsForOwner("order", order.id);
    const item = checklist[0];
    if (!item) throw new Error("expected a generated document checklist item");

    expect(
      await attachDocumentFile(item.id, { buffer: PDF_BYTES, detectedKind: "pdf" }, execAScope),
    ).toBeNull();
    expect(await rejectDocument(item.id, "nope", execAScope)).toBeNull();

    const attachedByOwner = await attachDocumentFile(
      item.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execBScope,
    );
    if (attachedByOwner?.path) savedKeys.push(attachedByOwner.path);
    expect(await verifyDocument(item.id, execAScope)).toBeNull();
  });

  it("returns null when attaching, verifying, or rejecting an unknown document id", async () => {
    const unknownId = "00000000-0000-0000-0000-000000000000";
    expect(
      await attachDocumentFile(unknownId, { buffer: PDF_BYTES, detectedKind: "pdf" }, managerScope),
    ).toBeNull();
    expect(await verifyDocument(unknownId, managerScope)).toBeNull();
    expect(await rejectDocument(unknownId, "reason", managerScope)).toBeNull();
    expect(await getDocumentForDownload(unknownId, managerScope)).toBeNull();
  });

  it("scopes getDocumentForDownload to the executive's own owner, and blocks others", async () => {
    const client = await makeClient("+919876603006", execAId);
    const order = await createOrder(
      {
        clientId: client.id,
        serviceId: pvtLtdServiceId,
        quotedPricePaise: 100000,
        assignedTo: execAId,
        notes: "doc-test-marker download",
      },
      managerScope,
    );
    const checklist = await listDocumentsForOwner("order", order.id);
    const item = checklist[0];
    if (!item) throw new Error("expected a generated document checklist item");
    const attached = await attachDocumentFile(
      item.id,
      { buffer: PDF_BYTES, detectedKind: "pdf" },
      execAScope,
    );
    if (attached?.path) savedKeys.push(attached.path);

    expect(await getDocumentForDownload(item.id, execAScope)).not.toBeNull();
    expect(await getDocumentForDownload(item.id, execBScope)).toBeNull();
    expect(await getDocumentForDownload(item.id, managerScope)).not.toBeNull();
  });

  it("getDocument returns null for an unknown id", async () => {
    expect(await getDocument("00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });
});
