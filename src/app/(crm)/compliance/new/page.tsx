import { CalendarPlusIcon } from "lucide-react";
import { createComplianceItemAction } from "@/actions/compliance";
import { toScope } from "@/actions/shared";
import { ComplianceForm } from "@/components/compliance/compliance-form";
import { CompliancePageHeader } from "@/components/compliance/compliance-page-header";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { listClientOptions } from "@/services/clients";

export default async function NewCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { clientId } = await searchParams;
  const scope = await toScope(user);

  const [clients, services] = await Promise.all([listClientOptions(scope), listServiceOptions()]);

  return (
    <div className="compliance-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <CompliancePageHeader
        title="New compliance item"
        description="Add a client deadline, recurrence schedule, and linked service for follow-through."
        icon={CalendarPlusIcon}
      />
      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-pink-200 bg-white p-8 text-center text-sm text-slate-500">
          No clients available yet — create a client first.
        </p>
      ) : (
        <ComplianceForm
          action={createComplianceItemAction}
          clients={clients}
          services={services}
          defaultClientId={clientId}
        />
      )}
    </div>
  );
}
