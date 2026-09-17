import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Clock3Icon,
  FolderTreeIcon,
  Layers3Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { CategoryFormDialog } from "@/components/catalog/category-form-dialog";
import { DeleteCategoryButton } from "@/components/catalog/delete-category-button";
import { DeleteVerticalButton } from "@/components/catalog/delete-vertical-button";
import { VerticalFormDialog } from "@/components/catalog/vertical-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listCatalog, listVerticalOptions } from "@/services/catalog";

export default async function CatalogPage() {
  const user = await requireUser();
  const [verticals, verticalOptions] = await Promise.all([listCatalog(), listVerticalOptions()]);
  const canManage = user.role === "super_admin" || user.role === "manager";
  const categoryCount = verticals.reduce(
    (total, vertical) => total + vertical.categories.length,
    0,
  );
  const serviceCount = verticals.reduce(
    (total, vertical) =>
      total + vertical.categories.reduce((sum, category) => sum + category.services.length, 0),
    0,
  );

  return (
    <div className="catalog-workflow flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9c2054] via-[#ba2a66] to-[#d94b86] px-5 py-6 text-white shadow-[0_22px_55px_-30px_rgba(107,28,64,0.65)] sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1.5px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, black, transparent)",
          }}
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <BriefcaseBusinessIcon className="size-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold tracking-[0.18em] text-pink-100 uppercase">
              Service library
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Catalogue</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pink-50/90">
              Organise what FirstMan sells, how much it costs, and how long delivery takes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <>
                <VerticalFormDialog triggerClassName="bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25" />
                <CategoryFormDialog
                  verticals={verticalOptions}
                  triggerClassName="bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                />
                <Button
                  size="sm"
                  className="bg-white text-pink-700 shadow-sm hover:bg-pink-50 hover:text-pink-800"
                  nativeButton={false}
                  render={<Link href="/catalog/services/new" />}
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                  New service
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <InventoryStat icon={Layers3Icon} label="Verticals" value={verticals.length} />
        <InventoryStat icon={FolderTreeIcon} label="Categories" value={categoryCount} />
        <InventoryStat icon={BriefcaseBusinessIcon} label="Active services" value={serviceCount} />
      </div>

      {verticals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pink-200 bg-white px-6 py-14 text-center">
          <Layers3Icon className="mx-auto size-10 text-pink-300" aria-hidden="true" />
          <h2 className="mt-3 font-semibold text-[#0b203a]">Start your service catalogue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a vertical, then add categories and services.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {verticals.map((vertical, verticalIndex) => {
            const verticalServiceCount = vertical.categories.reduce(
              (sum, category) => sum + category.services.length,
              0,
            );
            return (
              <section
                key={vertical.id}
                className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_16px_45px_-38px_rgba(107,28,64,0.45)]"
              >
                <header className="flex flex-col gap-3 border-b border-pink-100 bg-gradient-to-r from-pink-50/90 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-pink-600 text-xs font-bold text-white">
                      {String(verticalIndex + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-[#0b203a]">
                        {vertical.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {vertical.categories.length} categories · {verticalServiceCount} services
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <CategoryFormDialog
                        verticals={verticalOptions}
                        defaultVerticalId={vertical.id}
                      />
                      <VerticalFormDialog vertical={vertical} />
                      <DeleteVerticalButton verticalId={vertical.id} verticalName={vertical.name} />
                    </div>
                  ) : null}
                </header>

                <div className="flex flex-col gap-7 p-5">
                  {vertical.categories.map((category) => (
                    <div key={category.id}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#0b203a]">{category.name}</h3>
                          <Badge className="border-pink-100 bg-pink-50 text-pink-700">
                            {category.services.length}
                          </Badge>
                        </div>
                        {canManage ? (
                          <div className="flex gap-2">
                            <CategoryFormDialog category={category} verticals={verticalOptions} />
                            <DeleteCategoryButton
                              categoryId={category.id}
                              categoryName={category.name}
                            />
                          </div>
                        ) : null}
                      </div>

                      {category.services.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                          No services in this category yet.
                        </p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {category.services.map((service) => (
                            <article
                              key={service.id}
                              className="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-[0_16px_30px_-24px_rgba(186,42,102,0.55)]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-semibold leading-5 text-[#0b203a]">
                                  {service.name}
                                </h4>
                                {service.isRecurring ? (
                                  <Badge className="shrink-0 border-pink-100 bg-pink-50 text-pink-700">
                                    <RefreshCwIcon className="size-3" aria-hidden="true" />
                                    {service.recurrence}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                                {service.description || "Professional service managed by FirstMan."}
                              </p>
                              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
                                <div>
                                  <p className="text-lg font-bold tracking-tight text-pink-700">
                                    {formatMoney(service.basePricePaise)}
                                  </p>
                                  {service.govtFeePaise ? (
                                    <p className="text-[11px] text-slate-400">
                                      + {formatMoney(service.govtFeePaise)} govt. fee
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                  <Clock3Icon
                                    className="size-3.5 text-pink-500"
                                    aria-hidden="true"
                                  />
                                  {service.estimatedDays} days
                                </div>
                              </div>
                              {canManage ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-3 w-full justify-between text-pink-700 hover:bg-pink-50 hover:text-pink-800"
                                  nativeButton={false}
                                  render={<Link href={`/catalog/services/${service.id}/edit`} />}
                                >
                                  Manage service
                                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                                </Button>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InventoryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3Icon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-pink-100 bg-white px-4 py-3 shadow-sm">
      <span className="flex size-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-bold tracking-tight text-[#0b203a]">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
