import { BellRingIcon } from "lucide-react";
import { MarkAllNotificationsReadButton } from "@/components/mark-all-notifications-read-button";
import { NotificationList } from "@/components/notification-list";
import { requireUser } from "@/lib/session";
import { listNotificationsForUser } from "@/services/notifications";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotificationsForUser(user.id, 50);

  return (
    <div className="notification-workflow flex min-w-0 flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white px-5 py-6 shadow-[0_18px_45px_-32px_rgba(107,28,64,0.35)] sm:px-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 sm:block"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(186 42 102 / 0.14) 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, black 5%, transparent 95%)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 text-white shadow-sm shadow-pink-200">
              <BellRingIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-pink-600 uppercase">
                Activity center
              </p>
              <h1 className="text-2xl font-bold tracking-[-0.035em] text-[#0b203a]">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-500">Updates that need your attention.</p>
            </div>
          </div>
          <MarkAllNotificationsReadButton />
        </div>
      </section>

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
