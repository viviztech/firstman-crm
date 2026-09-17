import { formatInTimeZone } from "date-fns-tz";
import { PencilLineIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { updateServiceAction } from "@/actions/catalog";
import { CatalogPageHeader } from "@/components/catalog/catalog-page-header";
import { DeleteServiceButton } from "@/components/catalog/delete-service-button";
import { ServiceForm } from "@/components/catalog/service-form";
import { ServiceStatePricingEditor } from "@/components/catalog/service-state-pricing-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/session";
import {
  getServiceById,
  listServiceCategoryOptions,
  listServiceOptions,
  listServicePriceHistory,
  listServiceRelations,
} from "@/services/catalog";
import { listStates } from "@/services/geography";
import { listServiceStatePrices } from "@/services/service-pricing";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("super_admin", "manager");
  const { id } = await params;

  const [service, categories, allServices, priceHistory, relations, statePrices, states] =
    await Promise.all([
      getServiceById(id),
      listServiceCategoryOptions(),
      listServiceOptions(),
      listServicePriceHistory(id),
      listServiceRelations(id),
      listServiceStatePrices(id),
      listStates(),
    ]);

  if (!service) {
    notFound();
  }

  const otherServices = allServices.filter((candidate) => candidate.id !== id);

  return (
    <div className="catalog-workflow mx-auto flex w-full max-w-4xl flex-col gap-5">
      <CatalogPageHeader
        title={`Edit ${service.name}`}
        description="Keep pricing, delivery requirements, and related services accurate for the sales team."
        icon={PencilLineIcon}
      />

      <ServiceForm
        action={updateServiceAction.bind(null, id)}
        categories={categories}
        otherServices={otherServices}
        submitLabel="Save changes"
        defaultValues={{
          categoryId: service.categoryId,
          name: service.name,
          slug: service.slug,
          description: service.description,
          basePricePaise: service.basePricePaise,
          govtFeePaise: service.govtFeePaise,
          estimatedDays: service.estimatedDays,
          isRecurring: service.isRecurring,
          recurrence: service.recurrence,
          checklistTemplate: service.checklistTemplate,
          requiredDocuments: service.requiredDocuments,
        }}
        defaultRelations={relations.map((relation) => ({
          relatedServiceId: relation.relatedServiceId,
          relationType: relation.relationType,
        }))}
      />

      <Card className="border-pink-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0b203a]">Price history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {priceHistory.length === 0 ? (
            <p className="text-muted-foreground">No price changes recorded yet.</p>
          ) : (
            priceHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
              >
                <span>
                  {formatMoney(entry.basePricePaise)}
                  {entry.govtFeePaise ? ` + ${formatMoney(entry.govtFeePaise)} govt. fee` : ""}
                </span>
                <span className="text-muted-foreground">
                  {formatInTimeZone(entry.createdAt, env.TZ_DISPLAY, "d MMM yyyy, h:mm a")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ServiceStatePricingEditor
        serviceId={id}
        statePrices={statePrices}
        states={states.map((s) => ({ id: s.id, name: s.name }))}
      />

      <div className="flex justify-end border-t border-pink-100 pt-5">
        <DeleteServiceButton serviceId={id} serviceName={service.name} />
      </div>
    </div>
  );
}
