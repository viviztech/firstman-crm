"use client";

import Link from "next/link";
import { markNotificationReadAction } from "@/actions/notifications";
import { cn } from "@/lib/utils";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string | null;
  href: string;
  createdAt: string;
  isUnread: boolean;
};

export function NotificationList({ items }: { items: NotificationListItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>;
  }

  return (
    <div className="flex flex-col divide-y rounded-md border">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markNotificationReadAction(item.id)}
          className={cn(
            "flex flex-col gap-0.5 px-4 py-3 hover:bg-accent",
            item.isUnread && "bg-accent/40",
          )}
        >
          <span className="font-medium">{item.title}</span>
          {item.body ? <span className="text-sm text-muted-foreground">{item.body}</span> : null}
        </Link>
      ))}
    </div>
  );
}
