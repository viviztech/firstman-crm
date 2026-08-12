import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const metadata: Metadata = {
  title: "Pricing — FirstMan Corporate Services",
  description: "Transparent pricing for every service we offer — no hidden fees, no callback wall.",
};

export default async function PricingPage() {
  const catalog = await getPublicCatalog();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pricing</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          The same prices our team quotes — nothing held back behind a call.
        </p>
      </div>

      <div className="flex flex-col gap-14">
        {catalog.map((vertical) => (
          <div key={vertical.id} className="flex flex-col gap-8">
            <h2 className="text-xl font-extrabold tracking-tight">{vertical.name}</h2>
            {vertical.categories.map((category) => (
              <section key={category.id}>
                <h3 className="mb-3 text-lg font-bold">{category.name}</h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Service</th>
                        <th className="px-4 py-3 font-medium">Professional fee</th>
                        <th className="px-4 py-3 font-medium">Govt. fee</th>
                        <th className="px-4 py-3 font-medium">Turnaround</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {category.services.map((service) => (
                        <tr key={service.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{service.name}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatMoney(service.basePricePaise)}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">
                            {service.govtFeePaise ? formatMoney(service.govtFeePaise) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {service.estimatedDays} days
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/services/${service.slug}`}
                              className="text-brand font-medium hover:underline"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Prices exclude applicable taxes unless stated. Government fees vary by state and entity
        structure — the figures above are typical starting points; we'll confirm the exact amount
        for your case before any work begins.
      </p>
    </div>
  );
}
