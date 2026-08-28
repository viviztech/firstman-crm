import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, type notificationTypeEnum } from "@/db/schema/notifications";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

type NotificationInput = {
  userId: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  title: string;
  body?: string;
  href: string;
  entityType?: string;
  entityId?: string;
};

export async function createNotification(
  input: NotificationInput,
  executor: Executor = db,
): Promise<void> {
  await executor.insert(notifications).values(input);
}

/** Dedupe guard for cron-driven notifications (e.g. task-overdue) that would otherwise re-fire every tick. */
export async function hasUnreadNotificationFor(params: {
  userId: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  entityType: string;
  entityId: string;
}): Promise<boolean> {
  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, params.userId),
      eq(notifications.type, params.type),
      eq(notifications.entityType, params.entityType),
      eq(notifications.entityId, params.entityId),
      isNull(notifications.readAt),
      isNull(notifications.deletedAt),
    ),
    columns: { id: true },
  });
  return !!existing;
}

export async function listNotificationsForUser(userId: string, limit = 20) {
  return db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), isNull(notifications.deletedAt)),
    orderBy: [desc(notifications.readAt), desc(notifications.createdAt)],
    limit,
  });
}

export async function countUnreadForUser(userId: string): Promise<number> {
  const rows = await db.query.notifications.findMany({
    where: and(
      eq(notifications.userId, userId),
      isNull(notifications.deletedAt),
      isNull(notifications.readAt),
    ),
    columns: { id: true },
  });
  return rows.length;
}

/** Ownership-checked: a user can only ever mark their own notifications read. */
export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
