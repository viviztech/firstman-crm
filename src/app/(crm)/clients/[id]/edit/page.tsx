import { PencilLineIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { updateClientAction } from "@/actions/clients";
import { toScope } from "@/actions/shared";
import { ClientForm } from "@/components/clients/client-form";
import { ClientPageHeader } from "@/components/clients/client-page-header";
import { requireRole } from "@/lib/session";
import { getClient } from "@/services/clients";
import { listStates } from "@/services/geography";
import { listAssignableStaff } from "@/services/users";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [client, staff, states] = await Promise.all([
    getClient(id, await toScope(user)),
    listAssignableStaff(),
    listStates(),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="client-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <ClientPageHeader
        title="Edit client"
        description={`Keep ${client.name}'s identity, contact, tax, address, and ownership details current.`}
        icon={PencilLineIcon}
        backHref={`/clients/${id}`}
        backLabel="Back to client"
      />
      <ClientForm
        action={updateClientAction.bind(null, id)}
        role={user.role}
        staff={staff}
        states={states}
        submitLabel="Save changes"
        redirectTo={{ mode: "edit", clientId: id }}
        defaultValues={{
          type: client.type,
          name: client.name,
          businessName: client.businessName,
          phone: client.phone,
          email: client.email,
          gstin: client.gstin,
          pan: client.pan,
          address: client.address,
          city: client.city,
          state: client.state,
          pincode: client.pincode,
          assignedTo: client.assignedTo,
          referralSource: client.referralSource,
        }}
      />
    </div>
  );
}
