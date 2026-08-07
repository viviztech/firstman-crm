import { createServiceAction } from "@/actions/catalog";
import { ServiceForm } from "@/components/catalog/service-form";
import { requireRole } from "@/lib/session";
import { listServiceCategoryOptions, listServiceOptions } from "@/services/catalog";

export default async function NewServicePage() {
  await requireRole("super_admin", "manager");
  const [categories, otherServices] = await Promise.all([
    listServiceCategoryOptions(),
    listServiceOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New service</h1>
      <ServiceForm
        action={createServiceAction}
        categories={categories}
        otherServices={otherServices}
        submitLabel="Create service"
      />
    </div>
  );
}
