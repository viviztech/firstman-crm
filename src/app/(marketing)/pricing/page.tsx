import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";
import { formatMoney } from "@/lib/money";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Transparent business service pricing",
  description:
    "Published starting fees for company registration, tax, licensing, accounting, IP and compliance services.",
  path: "/pricing",
});
export default async function PricingPage() {
  const catalog = await getPublicCatalog();
  return (
    <div className="marketing-site bg-slate-50">
      <section className="border-b border-slate-200 bg-linear-to-b from-pink-50/70 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="text-xs font-bold tracking-[.18em] text-pink-700 uppercase">
            Clear commercial terms
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-[-.04em] text-slate-950 sm:text-6xl">
            Professional fees, published upfront.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Compare standard starting fees and typical turnaround times before you speak to anyone.
          </p>
          <div className="mt-9">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-pink-600 px-6 text-sm font-bold text-white hover:bg-pink-500"
            >
              Talk to an expert <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-12 rounded-2xl border border-pink-200 bg-pink-50 p-6 text-sm leading-6 text-pink-950">
          <strong>How pricing works:</strong> professional fees cover FirstMan’s stated scope.
          Government fees, taxes, stamp duty, certification and third-party charges are shown
          separately where known and confirmed before work begins.
        </div>
        <div className="space-y-16">
          {catalog.map((vertical) => (
            <section key={vertical.id}>
              <h2 className="text-2xl font-bold text-slate-950">{vertical.name}</h2>
              <div className="mt-7 space-y-8">
                {vertical.categories.map((category) => (
                  <div key={category.id}>
                    <h3 className="mb-3 text-xs font-bold tracking-[.14em] text-slate-500 uppercase">
                      {category.name}
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full min-w-175 text-sm">
                        <thead className="bg-slate-100 text-left text-xs text-slate-600 uppercase">
                          <tr>
                            <th className="px-5 py-4">Service</th>
                            <th className="px-5 py-4">Professional fee</th>
                            <th className="px-5 py-4">Govt. fee</th>
                            <th className="px-5 py-4">Timeline</th>
                            <th className="px-5 py-4" />
                          </tr>
                        </thead>
                        <tbody>
                          {category.services.map((service) => (
                            <tr
                              key={service.id}
                              className="border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-5 py-4 font-bold text-slate-950">{service.name}</td>
                              <td className="px-5 py-4 font-medium tabular-nums">
                                {formatMoney(service.basePricePaise)}
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                {service.govtFeePaise
                                  ? formatMoney(service.govtFeePaise)
                                  : "Case-specific"}
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                ~{service.estimatedDays} days
                              </td>
                              <td className="px-5 py-4 text-right">
                                <Link
                                  href={`/services/${service.slug}`}
                                  className="font-bold text-pink-700"
                                >
                                  Details →
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm leading-6 text-slate-500">
          Prices exclude applicable taxes unless stated. Timelines begin after complete documents
          are received and may change when a government department raises a query.
        </p>
      </div>
    </div>
  );
}
