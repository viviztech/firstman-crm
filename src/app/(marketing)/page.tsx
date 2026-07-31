import { ArrowRight, Banknote, MessageCircleMore, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLeadForm } from "@/components/marketing/lead-form";
import { formatMoney } from "@/lib/money";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const metadata: Metadata = {
  title: "FirstMan Corporate Services — Company Registration, GST & Compliance",
  description:
    "Private Limited, LLP, OPC and Proprietorship registration, GST, trademarks, and annual compliance — transparent pricing, tracked from start to finish.",
};

const DIFFERENTIATORS = [
  {
    icon: Banknote,
    title: "Pricing you can see upfront",
    body: 'Every price on this site comes straight from what our team quotes — no "request a callback" wall.',
  },
  {
    icon: MessageCircleMore,
    title: "Updates where you already are",
    body: "WhatsApp and email updates as your registration moves — not just a portal you have to remember to check.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing falls through the cracks",
    body: "Every filing runs through the same task checklist our team uses internally, end to end.",
  },
];

export default async function MarketingHomePage() {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);
  const services = catalog.flatMap((category) => category.services);
  const featured = services.slice(0, 6);

  return (
    <>
      <section className="border-b bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <span className="text-brand text-sm font-semibold tracking-wide uppercase">
            Serving {profile.areasServed}
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Company registration and compliance, handled properly.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Private Limited, LLP, OPC, GST, trademarks, and annual filings — one team, transparent
            pricing, and real updates as your paperwork moves.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex h-11 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Browse services
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Popular services</h2>
          <Link href="/services" className="text-brand text-sm font-semibold hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="hover:border-brand/40 group flex flex-col gap-2 rounded-xl border bg-card p-5 transition-colors"
            >
              <h3 className="group-hover:text-brand font-semibold transition-colors">
                {service.name}
              </h3>
              {service.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
              ) : null}
              <span className="mt-auto pt-2 text-sm font-medium">
                Starting {formatMoney(service.basePricePaise)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {DIFFERENTIATORS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon className="text-brand size-6" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Tell us what you need</h2>
            <p className="max-w-md text-muted-foreground">
              Share a few details and we'll get back to you — usually the same day.
            </p>
          </div>
          <MarketingLeadForm services={services.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </section>
    </>
  );
}
