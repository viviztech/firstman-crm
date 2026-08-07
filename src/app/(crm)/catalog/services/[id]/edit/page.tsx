import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import { updateServiceAction } from "@/actions/catalog";
import { DeleteServiceButton } from "@/components/catalog/delete-service-button";
import { ServiceForm } from "@/components/catalog/service-form";
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

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("super_admin", "manager");
  const { id } = await params;

  const [service, categories, allServices, priceHistory, relations] = await Promise.all([
    getServiceById(id),
    listServiceCategoryOptions(),
    listServiceOptions(),
    listServicePriceHistory(id),
    listServiceRelations(id),
  ]);

  if (!service) {
    notFound();
  }

  const otherServices = allServices.filter((candidate) => candidate.id !== id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit service</h1>
        <DeleteServiceButton serviceId={id} serviceName={service.name} />
      </div>

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

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Price history</CardTitle>
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
    </div>
  );
}
