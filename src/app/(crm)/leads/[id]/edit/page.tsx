import { notFound } from "next/navigation";
import { updateLeadAction } from "@/actions/leads";
import { LeadForm } from "@/components/leads/lead-form";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { getLead } from "@/services/leads";
import { listAssignableStaff } from "@/services/users";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [lead, staff, services] = await Promise.all([
    getLead(id, { userId: user.id, role: user.role }),
    listAssignableStaff(),
    listServiceOptions(),
  ]);

  if (!lead) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit lead</h1>
      <LeadForm
        action={updateLeadAction.bind(null, id)}
        role={user.role}
        staff={staff}
        services={services}
        submitLabel="Save changes"
        redirectTo={{ mode: "edit", leadId: id }}
        defaultValues={{
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          city: lead.city,
          source: lead.source,
          serviceInterestedId: lead.serviceInterestedId,
          assignedTo: lead.assignedTo,
          nextFollowUpAt: lead.nextFollowUpAt,
          notes: lead.notes,
        }}
      />
    </div>
  );
}
