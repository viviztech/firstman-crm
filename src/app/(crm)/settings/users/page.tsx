import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { UsersTable } from "@/components/settings/users-table";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { listAllStaffForAdmin } from "@/services/users";

export default async function UsersSettingsPage() {
  const currentUser = await requireRole("super_admin");
  const [staff, services] = await Promise.all([listAllStaffForAdmin(), listServiceOptions()]);

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/settings" />}
      >
        <ChevronLeft className="size-4" /> Settings
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Invite staff, change roles, and deactivate accounts.
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <UsersTable staff={staff} currentUserId={currentUser.id} services={services} />
    </div>
  );
}
