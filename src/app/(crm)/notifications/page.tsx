import { MarkAllNotificationsReadButton } from "@/components/mark-all-notifications-read-button";
import { NotificationList } from "@/components/notification-list";
import { requireUser } from "@/lib/session";
import { listNotificationsForUser } from "@/services/notifications";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotificationsForUser(user.id, 50);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <MarkAllNotificationsReadButton />
      </div>

      <NotificationList
        items={notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          createdAt: notification.createdAt.toISOString(),
          isUnread: notification.readAt === null,
        }))}
      />
    </div>
  );
}
