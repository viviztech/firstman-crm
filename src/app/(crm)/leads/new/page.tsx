import { createLeadAction } from "@/actions/leads";
import { LeadForm } from "@/components/leads/lead-form";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { listAssignableStaff } from "@/services/users";

export default async function NewLeadPage() {
  const user = await requireRole("super_admin", "manager", "executive");
  const [staff, services] = await Promise.all([listAssignableStaff(), listServiceOptions()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New lead</h1>
      <LeadForm
        action={createLeadAction}
        role={user.role}
        staff={staff}
        services={services}
        submitLabel="Create lead"
        redirectTo={{ mode: "create" }}
      />
    </div>
  );
}
