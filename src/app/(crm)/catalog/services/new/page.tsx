import { PackagePlusIcon } from "lucide-react";
import { createServiceAction } from "@/actions/catalog";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
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
    <div className="catalog-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <CatalogPageHeader
        title="New service"
        description="Add a service, pricing, delivery timeline, and the documents your team needs to fulfil it."
        icon={PackagePlusIcon}
      />
      <ServiceForm
        action={createServiceAction}
        categories={categories}
        otherServices={otherServices}
        submitLabel="Create service"
      />
    </div>
  );
}
