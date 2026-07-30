import { notFound } from "next/navigation";
import { updateClientAction } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { requireRole } from "@/lib/session";
import { getClient } from "@/services/clients";
import { listAssignableStaff } from "@/services/users";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [client, staff] = await Promise.all([
    getClient(id, { userId: user.id, role: user.role }),
    listAssignableStaff(),
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
