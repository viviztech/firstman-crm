import { UserPlusIcon } from "lucide-react";
import { createClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { ClientPageHeader } from "@/components/clients/client-page-header";
import { requireRole } from "@/lib/session";
import { listStates } from "@/services/geography";
import { listAssignableStaff } from "@/services/users";

export default async function NewClientPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [staff, states] = await Promise.all([listAssignableStaff(), listStates()]);

  return (
    <div className="client-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <ClientPageHeader
        title="New client"
        description="Create a complete account record for service delivery, documents, compliance, and billing."
        icon={UserPlusIcon}
      />
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
