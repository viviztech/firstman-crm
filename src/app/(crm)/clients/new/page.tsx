import { createClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { requireRole } from "@/lib/session";
import { listAssignableStaff } from "@/services/users";

export default async function NewClientPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const staff = await listAssignableStaff();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New client</h1>
      <ClientForm
        action={createClientAction}
        role={user.role}
        staff={staff}
        submitLabel="Create client"
        redirectTo={{ mode: "create" }}
      />
    </div>
  );
}
