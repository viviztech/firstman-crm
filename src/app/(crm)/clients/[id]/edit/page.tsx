import { notFound } from "next/navigation";
import { updateClientAction } from "@/actions/clients";
import { toScope } from "@/actions/shared";
import { ClientForm } from "@/components/clients/client-form";
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit client</h1>
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
