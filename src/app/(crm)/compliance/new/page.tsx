import { createComplianceItemAction } from "@/actions/compliance";
import { ComplianceForm } from "@/components/compliance/compliance-form";
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
  const scope = { userId: user.id, role: user.role };

  const [clients, services] = await Promise.all([listClientOptions(scope), listServiceOptions()]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New compliance item</h1>
      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
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
