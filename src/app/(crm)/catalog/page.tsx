import Link from "next/link";
import { CategoryFormDialog } from "@/components/catalog/category-form-dialog";
import { DeleteCategoryButton } from "@/components/catalog/delete-category-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listCatalog } from "@/services/catalog";

export default async function CatalogPage() {
  const user = await requireUser();
  const categories = await listCatalog();
  const canManage = user.role === "super_admin" || user.role === "manager";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Catalog</h1>
          <p className="text-sm text-muted-foreground">
            The full FirstMan service catalog, grouped by category.
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <CategoryFormDialog />
            <Button size="sm" nativeButton={false} render={<Link href="/catalog/services/new" />}>
              New service
            </Button>
          </div>
        ) : null}
      </div>

      {categories.map((category) => (
        <div key={category.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">{category.name}</h2>
            {canManage ? (
              <div className="flex gap-1">
                <CategoryFormDialog category={category} />
                <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {category.services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{service.name}</span>
                    {service.isRecurring ? (
                      <Badge variant="secondary">{service.recurrence}</Badge>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {service.description ? <p>{service.description}</p> : null}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-foreground">
                    <span>{formatMoney(service.basePricePaise)}</span>
                    {service.govtFeePaise ? (
                      <span className="text-muted-foreground">
                        + {formatMoney(service.govtFeePaise)} govt. fee
                      </span>
                    ) : null}
                    <span>{service.estimatedDays} days</span>
                  </div>
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      nativeButton={false}
                      render={<Link href={`/catalog/services/${service.id}/edit`} />}
                    >
                      Edit
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
