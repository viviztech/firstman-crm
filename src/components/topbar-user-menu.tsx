"use client";

import { ChevronDownIcon, GlobeIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function TopbarUserMenu({
  name,
  role,
  showSettings,
  roleLabel,
}: {
  name: string;
  role: string;
  showSettings: boolean;
  roleLabel?: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
        <Avatar size="sm">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {roleLabel ?? role.replace("_", " ")}
          </span>
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="flex flex-col">
              <span className="font-medium text-foreground">{name}</span>
              <span className="text-xs">{roleLabel ?? role.replace("_", " ")}</span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" />}>
          <GlobeIcon />
          Go to website
        </DropdownMenuItem>
        {showSettings ? (
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
