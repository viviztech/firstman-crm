"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { markNotificationReadAction } from "@/actions/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NotificationItem = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
};

/** Bell in the topbar surfacing whatever's overdue/due for the signed-in user's role — same
 * scoped queries the dashboard already runs, just capped and rendered as a dropdown. */
export function NotificationsBell({
  items,
  totalCount,
  seeAllHref,
}: {
  items: NotificationItem[];
  totalCount: number;
  seeAllHref: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        <BellIcon className="size-5" />
        {totalCount > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Needs your attention</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-1.5 py-4 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              render={<Link href={item.href} onClick={() => markNotificationReadAction(item.id)} />}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.sublabel}</span>
              </div>
            </DropdownMenuItem>
          ))
        )}
        {totalCount > items.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={seeAllHref} />}>View all</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
