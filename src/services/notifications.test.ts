import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { user } from "@/db/schema/auth-schema";
import { notifications } from "@/db/schema/notifications";
import {
  countUnreadForUser,
  createNotification,
  hasUnreadNotificationFor,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

describe("notifications service (integration)", () => {
  const userAId = randomUUID();
  const userBId = randomUUID();

  beforeAll(async () => {
    await db.insert(user).values([
      {
        id: userAId,
        name: "Notifications Test User A",
        email: `notifications-a-${userAId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
      {
        id: userBId,
        name: "Notifications Test User B",
        email: `notifications-b-${userBId}@test.local`,
        emailVerified: true,
        role: "executive",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, userAId));
    await db.delete(notifications).where(eq(notifications.userId, userBId));
    await db.delete(user).where(eq(user.id, userAId));
    await db.delete(user).where(eq(user.id, userBId));
  });

  it("creates a notification and lists it unread-first for that user only", async () => {
    await createNotification({
      userId: userAId,
      type: "enquiry_assigned",
      title: "Test notification",
      body: "Some body",
      href: "/enquiries/123",
      entityType: "enquiry",
      entityId: randomUUID(),
    });

    const listA = await listNotificationsForUser(userAId);
    expect(listA).toHaveLength(1);
    expect(listA[0]?.title).toBe("Test notification");

    const listB = await listNotificationsForUser(userBId);
    expect(listB).toHaveLength(0);
  });

  it("counts only unread notifications, and mark-read excludes them from the count", async () => {
    const before = await countUnreadForUser(userAId);
    expect(before).toBeGreaterThan(0);

    const [row] = await db.query.notifications.findMany({
      where: eq(notifications.userId, userAId),
      limit: 1,
    });
    if (!row) throw new Error("expected a fixture notification");

    await markNotificationRead(row.id, userAId);
    const after = await countUnreadForUser(userAId);
    expect(after).toBe(before - 1);
  });

  it("does not let a user mark another user's notification as read", async () => {
    await createNotification({
      userId: userAId,
      type: "order_status_changed",
      title: "Cross-user test",
      href: "/orders/123",
    });
    const [row] = await db.query.notifications.findMany({
      where: eq(notifications.userId, userAId),
      orderBy: (n, { desc }) => [desc(n.createdAt)],
      limit: 1,
    });
    if (!row) throw new Error("expected a fixture notification");

    await markNotificationRead(row.id, userBId);

    const stillUnread = await db.query.notifications.findFirst({
      where: eq(notifications.id, row.id),
    });
    expect(stillUnread?.readAt).toBeNull();
  });

  it("marks all of a user's unread notifications read in one call", async () => {
    await createNotification({
      userId: userBId,
      type: "task_overdue",
      title: "B1",
      href: "/orders/1",
    });
    await createNotification({
      userId: userBId,
      type: "task_overdue",
      title: "B2",
      href: "/orders/2",
    });
    expect(await countUnreadForUser(userBId)).toBe(2);

    await markAllNotificationsRead(userBId);
    expect(await countUnreadForUser(userBId)).toBe(0);
  });

  it("hasUnreadNotificationFor detects an existing unread match and ignores read ones", async () => {
    const entityId = randomUUID();
    await createNotification({
      userId: userAId,
      type: "task_overdue",
      title: "Dedupe test",
      href: "/orders/1",
      entityType: "order_task",
      entityId,
    });

    expect(
      await hasUnreadNotificationFor({
        userId: userAId,
        type: "task_overdue",
        entityType: "order_task",
        entityId,
      }),
    ).toBe(true);

    await markAllNotificationsRead(userAId);

    expect(
      await hasUnreadNotificationFor({
        userId: userAId,
        type: "task_overdue",
        entityType: "order_task",
        entityId,
      }),
    ).toBe(false);
  });
});
