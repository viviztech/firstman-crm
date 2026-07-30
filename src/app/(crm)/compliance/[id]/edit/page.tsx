import { notFound } from "next/navigation";
import { updateComplianceItemAction } from "@/actions/compliance";
import { ComplianceEditForm } from "@/components/compliance/compliance-edit-form";
import { requireRole } from "@/lib/session";
import { listServiceOptions } from "@/services/catalog";
import { getComplianceItem } from "@/services/compliance";

export default async function EditCompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("super_admin", "manager", "executive");
  const { id } = await params;

  const [item, services] = await Promise.all([
    getComplianceItem(id, { userId: user.id, role: user.role }),
    listServiceOptions(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit compliance item</h1>
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
