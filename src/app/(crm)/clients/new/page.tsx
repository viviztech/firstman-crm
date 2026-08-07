import { createClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { requireRole } from "@/lib/session";
import { listStates } from "@/services/geography";
import { listAssignableStaff } from "@/services/users";

export default async function NewClientPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [staff, states] = await Promise.all([listAssignableStaff(), listStates()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New client</h1>
      <ClientForm
        action={createClientAction}
        role={user.role}
        staff={staff}
        states={states}
        submitLabel="Create client"
        redirectTo={{ mode: "create" }}
      />
    </div>
  );
}
