import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const metadata: Metadata = {
  title: "Services — FirstMan Corporate Services",
  description:
    "Company registration, GST, trademarks, licenses, and annual compliance — full service catalog with transparent pricing.",
};

export default async function ServicesHubPage() {
  const catalog = await getPublicCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything you need, one place
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Every service we offer, with pricing that matches what our team actually quotes.
        </p>
      </div>

      <div className="flex flex-col gap-16">
        {catalog.map((vertical) => (
          <div key={vertical.id} className="flex flex-col gap-10">
            <h2 className="text-xl font-extrabold tracking-tight">{vertical.name}</h2>
            {vertical.categories.map((category) => (
              <section key={category.id}>
                <h3 className="mb-5 text-lg font-bold tracking-tight">{category.name}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.services.map((service) => (
                    <Link
                      key={service.id}
                      href={`/services/${service.slug}`}
                      className="hover:border-brand/40 group flex flex-col gap-2 rounded-xl border bg-card p-5 transition-colors"
                    >
                      <h4 className="group-hover:text-brand font-semibold transition-colors">
                        {service.name}
                      </h4>
                      {service.description ? (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between pt-2 text-sm">
                        <span className="font-medium">
                          Starting {formatMoney(service.basePricePaise)}
                        </span>
                        <span className="text-muted-foreground">{service.estimatedDays} days</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
