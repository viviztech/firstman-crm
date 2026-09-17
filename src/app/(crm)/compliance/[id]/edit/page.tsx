import { CalendarCogIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { updateComplianceItemAction } from "@/actions/compliance";
import { toScope } from "@/actions/shared";
import { ComplianceEditForm } from "@/components/compliance/compliance-edit-form";
import { CompliancePageHeader } from "@/components/compliance/compliance-page-header";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { getComplianceItem } from "@/services/compliance";

export default async function EditCompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [item, services] = await Promise.all([
    getComplianceItem(id, await toScope(user)),
    listServiceOptions(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="compliance-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <CompliancePageHeader
        title="Edit compliance item"
        description={`Update the deadline, recurrence, and service details for ${item.title}.`}
        icon={CalendarCogIcon}
        backHref={`/compliance/${id}`}
      />
      <ComplianceEditForm
        action={updateComplianceItemAction.bind(null, id)}
        services={services}
        itemId={id}
        defaultValues={{
          serviceId: item.serviceId,
          title: item.title,
          description: item.description,
          dueDate: item.dueDate,
          recurrence: item.recurrence,
        }}
      />
    </div>
  );
}
