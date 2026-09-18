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
    return (
      <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-10 text-center">
        <p className="font-semibold text-[#0b203a]">You&apos;re all caught up</p>
        <p className="mt-1 text-sm text-slate-500">New activity will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-pink-50 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markNotificationReadAction(item.id)}
          className={cn(
            "relative flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-pink-50/60",
            item.isUnread &&
              "bg-pink-50/45 pl-7 before:absolute before:top-1/2 before:left-3 before:size-2 before:-translate-y-1/2 before:rounded-full before:bg-pink-600",
          )}
        >
          <span className="font-medium">{item.title}</span>
          {item.body ? <span className="text-sm text-muted-foreground">{item.body}</span> : null}
        </Link>
      ))}
    </div>
  );
}
