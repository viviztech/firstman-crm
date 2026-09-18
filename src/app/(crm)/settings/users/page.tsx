import { UsersIcon } from "lucide-react";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { UsersTable } from "@/components/settings/users-table";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { listAllStaffForAdmin } from "@/services/users";

export default async function UsersSettingsPage() {
  const currentUser = await requireRole("super_admin");
  const [staff, services] = await Promise.all([listAllStaffForAdmin(), listServiceOptions()]);

  return (
    <div className="settings-workflow flex min-w-0 flex-col gap-5">
      <SettingsPageHeader
        title="Users"
        description="Invite staff, change roles, define access scope, and deactivate accounts."
        icon={UsersIcon}
        actions={<InviteUserDialog />}
      />
      <div className="min-w-0 overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <UsersTable staff={staff} currentUserId={currentUser.id} services={services} />
      </div>
    </div>
  );
}
