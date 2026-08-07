import { ArrowRight, ArrowUpRight, Banknote, MessageCircleMore, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingEnquiryForm } from "@/components/marketing/enquiry-form";
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
      <section className="relative overflow-hidden border-b">
        <div
          className="marketing-hero-grid pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-7 px-4 py-20 sm:px-6 sm:py-28">
          <span className="reveal border-brand/20 bg-brand-muted text-brand inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Serving {profile.areasServed}
          </span>
          <h1 className="reveal reveal-delay-1 font-display max-w-3xl text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
            Company registration and compliance, handled properly.
          </h1>
          <p className="reveal reveal-delay-2 max-w-2xl text-lg text-muted-foreground">
            Private Limited, LLP, OPC, GST, trademarks, and annual filings — one team, transparent
            pricing, and real updates as your paperwork moves.
          </p>
          <div className="reveal reveal-delay-3 flex flex-wrap gap-3 pt-1">
            <Link
              href="/contact"
              className="bg-brand text-brand-foreground hover:bg-brand/90 shadow-brand/20 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold shadow-lg transition-all hover:shadow-xl"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/services"
              className="bg-background/60 inline-flex h-11 items-center justify-center rounded-lg border px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-muted"
            >
              Browse services
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-medium tracking-tight">Popular services</h2>
          <Link
            href="/services"
            className="text-brand group inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            View all
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="hover:border-brand/30 group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="bg-brand absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
              <div className="flex items-start justify-between gap-2">
                <h3 className="group-hover:text-brand font-semibold transition-colors">
                  {service.name}
                </h3>
                <ArrowUpRight className="text-muted-foreground group-hover:text-brand size-4 shrink-0 -translate-x-1 translate-y-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
              </div>
              {service.description ? (
                <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
              ) : null}
              <span className="mt-auto pt-3 text-sm font-medium tabular-nums">
                Starting {formatMoney(service.basePricePaise)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* A deliberately dark band regardless of light/dark theme — literal neutral, not the
          theme-adaptive brand-ink token, since this section always reads dark by design. */}
      <section className="bg-neutral-950 text-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-3">
          {DIFFERENTIATORS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="inline-flex size-10 items-center justify-center rounded-full bg-white/10">
                <Icon className="text-brand size-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-neutral-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 rounded-3xl border bg-card/50 p-8 sm:p-10 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-medium tracking-tight">
              Tell us what you need
            </h2>
            <p className="max-w-md text-muted-foreground">
              Share a few details and we'll get back to you — usually the same day.
            </p>
          </div>
          <MarketingEnquiryForm services={services.map((s) => ({ id: s.id, name: s.name }))} />
        </div>
      </section>
    </>
  );
}
