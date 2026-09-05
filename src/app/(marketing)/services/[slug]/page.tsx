import { ArrowRight, CheckCircle2, Clock3, FileText, IndianRupee, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuickEnquiryForm } from "@/components/marketing/enquiry-form";
import { JsonLd } from "@/components/marketing/json-ld";
import { Badge } from "@/components/ui/badge";
import { getArticlesForService } from "@/content/resources";
import { getServicePageContent } from "@/content/service-content";
import { getServiceContentOverride, resolveOverrideFee } from "@/content/service-content-overrides";
import { getAppUrl } from "@/lib/app-url";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";
import { formatMoney } from "@/lib/money";
import {
  getPublicServiceBySlug,
  getPublicServices,
  getRelatedServices,
} from "@/services/marketing-catalog";

export async function generateStaticParams() {
  return (await getPublicServices()).map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getPublicServiceBySlug(slug);
  if (!s) return {};
  const rawOverride = getServiceContentOverride(slug);
  const override = rawOverride
    ? resolveOverrideFee(rawOverride, formatMoney(s.basePricePaise))
    : undefined;
  return buildMarketingMetadata({
    title: override?.metaTitle ?? `${s.name} — Fees, documents & process`,
    description:
      override?.metaDescription ??
      `Get ${s.name} handled end to end across Tamil Nadu. Starting ${formatMoney(s.basePricePaise)}, typical turnaround ${s.estimatedDays} business days. See documents, process and deliverables.`,
    path: `/services/${slug}`,
  });
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  if (!service) notFound();
  const genericContent = getServicePageContent(service);
  const feeFormatted = formatMoney(service.basePricePaise);
  const rawOverride = getServiceContentOverride(service.slug);
  const override = rawOverride ? resolveOverrideFee(rawOverride, feeFormatted) : undefined;
  const content = { ...genericContent, ...override?.base };
  const relatedServices = await getRelatedServices(service.categoryId, service.slug);
  const relatedGuides = getArticlesForService(service.slug);
  const faqs = override?.faqs ?? [
    {
      question: `What is included in ${service.name}?`,
      answer: `The engagement covers requirement review, document verification, preparation, filing or execution support, query coordination, and final handover. The exact scope is confirmed before work starts.`,
    },
    {
      question: "What does it cost?",
      answer: service.govtFeePaise
        ? `Professional fees start at ${formatMoney(service.basePricePaise)} plus typical government fees of ${formatMoney(service.govtFeePaise)}. Your confirmed estimate will identify any case-specific charges.`
        : `Professional fees start at ${formatMoney(service.basePricePaise)}. We confirm taxes and any third-party charges before you proceed.`,
    },
    {
      question: "How long will it take?",
      answer: `The typical turnaround is ${service.estimatedDays} business days after complete documents are received. Government processing or clarification requests can affect the final date.`,
    },
    {
      question: "How will I track progress?",
      answer:
        "Your FirstMan contact coordinates the matter end to end and shares milestone updates, outstanding requirements, and final records by your agreed communication channel.",
    },
  ];
  return (
    <div className="marketing-site bg-white">
      <section className="border-b border-slate-200 bg-linear-to-b from-pink-50/70 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <nav className="text-xs font-medium text-slate-500">
            <Link href="/services" className="hover:text-slate-950">
              Services
            </Link>
            <span className="mx-2">/</span>
            {service.categoryName}
          </nav>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
            <div>
              <Badge className="border-pink-200 bg-pink-50 text-pink-800">{content.eyebrow}</Badge>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-.035em] text-balance text-slate-950 sm:text-5xl lg:text-6xl">
                {service.name}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{content.summary}</p>
              {override?.lastUpdated ? (
                <p className="mt-4 text-xs text-slate-500">
                  Written by the FirstMan compliance desk. Last updated: {override.lastUpdated}.
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
                <span className="flex items-center gap-2">
                  <IndianRupee className="size-4 text-pink-600" />
                  From {formatMoney(service.basePricePaise)}
                  {service.govtFeePaise ? (
                    <span className="text-slate-400">
                      + {formatMoney(service.govtFeePaise)} govt. fee
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 className="size-4 text-pink-600" />
                  {service.estimatedDays} business days
                </span>
              </div>
              {override?.heroNote ? (
                <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-500">
                  {override.heroNote}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5">
              <p className="text-xs font-bold tracking-[.14em] text-pink-700 uppercase">
                Discuss this service
              </p>
              <h2 className="mt-2 text-lg font-bold text-slate-950">Get a callback today.</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Share your name and number — a specialist will call you back.
              </p>
              <div className="mt-4">
                <QuickEnquiryForm defaultServiceId={service.id} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <main className="space-y-16">
          {override?.documentGroups ? (
            <section className="rounded-2xl bg-slate-50 p-7">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-pink-700" />
                <h2 className="text-xl font-bold text-slate-950">Documents required</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Requirements differ by who is involved in the filing.
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {override.documentGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="font-bold text-slate-950">{group.title}</h3>
                    {group.note ? (
                      <p className="mt-1 text-xs text-slate-500">{group.note}</p>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pink-700" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : service.requiredDocuments.length ? (
            <section className="rounded-2xl bg-slate-50 p-7">
              <div className="flex items-center gap-3">
                <FileText className="size-5 text-pink-700" />
                <h2 className="text-xl font-bold text-slate-950">Documents to prepare</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                We confirm the final checklist for your case. The standard starting set is:
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {service.requiredDocuments.map((doc) => (
                  <p key={doc} className="flex gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pink-700" />
                    {doc}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <p className="marketing-kicker">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              A controlled four-stage process.
            </h2>
            <div className="mt-8 border-l border-slate-200">
              {content.process.map((step, index) => (
                <div key={step.title} className="relative pb-8 pl-8 last:pb-0">
                  <span className="absolute -left-4 top-0 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h3 className="font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </section>
          {override?.timeline ? (
            <section>
              <p className="marketing-kicker">Step by step</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                A realistic day-by-day timeline.
              </h2>
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                      <th className="px-4 py-3">Day</th>
                      <th className="px-4 py-3">Milestone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {override.timeline.map((row) => (
                      <tr key={row.day} className="border-b border-slate-200 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-700">{row.day}</td>
                        <td className="px-4 py-3 text-slate-600">{row.milestone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                This timeline assumes complete, correctly formatted documents on Day 1. Name
                conflicts or incomplete address proof add 3 to 7 days for resubmission.
              </p>
            </section>
          ) : null}
          <section>
            <p className="marketing-kicker">What you receive</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              A defined outcome, not just a submission.
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {content.outcomes.map((item) => (
                <div key={item} className="flex gap-3 rounded-xl border border-slate-200 p-5">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-pink-700" />
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="grid gap-10 sm:grid-cols-2">
            <section>
              <h2 className="text-xl font-bold text-slate-950">Included in the engagement</h2>
              <ul className="mt-5 space-y-3">
                {content.includes.map((x) => (
                  <li key={x} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                    {x}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-bold text-slate-950">Best suited for</h2>
              <ul className="mt-5 space-y-3">
                {content.idealFor.map((x) => (
                  <li key={x} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />
                    {x}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {override?.rejectionReasons ? (
            <section>
              <p className="marketing-kicker">Avoid resubmission</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Why SPICe+ filings get rejected, and how we prevent it.
              </h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {override.rejectionReasons.map((item) => (
                  <div key={item.reason} className="rounded-xl border border-slate-200 p-5">
                    <p className="font-bold text-slate-950">{item.reason}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {override?.complianceCalendar ? (
            <section>
              <p className="marketing-kicker">After incorporation</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Your first 12 months of compliance.
              </h2>
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                      <th className="px-4 py-3">Milestone</th>
                      <th className="px-4 py-3">Due by</th>
                      <th className="px-4 py-3">Penalty for missing it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {override.complianceCalendar.map((row) => (
                      <tr key={row.milestone} className="border-b border-slate-200 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-700">{row.milestone}</td>
                        <td className="px-4 py-3 text-slate-600">{row.dueBy}</td>
                        <td className="px-4 py-3 text-slate-600">{row.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {override?.decisionFramework ? (
            <section>
              <p className="marketing-kicker">Is this the right structure?</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Who should, and should not, register a Private Limited Company.
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                {override.decisionFramework.intro}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {override.decisionFramework.chooseInstead.map((option) => (
                  <Link
                    key={option.structure}
                    href={option.href}
                    className="group rounded-xl border border-slate-200 p-5 hover:border-pink-300"
                  >
                    <p className="flex items-center justify-between font-bold text-slate-950 group-hover:text-pink-700">
                      Choose {option.structure} instead
                      <ArrowRight className="size-4 shrink-0 text-slate-400 group-hover:translate-x-1 group-hover:text-pink-700" />
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">if {option.when}</p>
                  </Link>
                ))}
              </div>
              {override.structureComparison ? (
                <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        <th className="px-4 py-3">Factor</th>
                        {override.structureComparison.columns.map((col) => (
                          <th key={col} className="px-4 py-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {override.structureComparison.rows.map((row) => (
                        <tr
                          key={row.factor}
                          className="border-b border-slate-200 align-top last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-slate-700">{row.factor}</td>
                          {row.values.map((value, i) => (
                            <td
                              key={`${row.factor}-${override.structureComparison?.columns[i]}`}
                              className="px-4 py-3 text-slate-600"
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ) : null}
          <section>
            <p className="marketing-kicker">Questions</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Before you proceed.
            </h2>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((f) => (
                <details key={f.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-950 [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="text-pink-700">+</span>
                  </summary>
                  <p className="max-w-3xl pt-3 text-sm leading-7 text-slate-600">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
          {override?.localNote ? (
            <section className="rounded-2xl bg-slate-50 p-7">
              <h2 className="text-xl font-bold text-slate-950">{override.localNote.heading}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {override.localNote.body}
              </p>
            </section>
          ) : null}
          {override?.scopeTable ? (
            <section>
              <p className="marketing-kicker">Scope</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                What the {feeFormatted} fee includes and excludes.
              </h2>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="font-bold text-emerald-700">Included</h3>
                  <ul className="mt-3 space-y-2">
                    {override.scopeTable.included.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-slate-500">Not included, billed separately</h3>
                  <ul className="mt-3 space-y-2">
                    {override.scopeTable.excluded.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                        <span className="mt-0.5 size-4 shrink-0 text-center text-slate-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}
          {override?.costBreakdown ? (
            <section>
              <p className="marketing-kicker">Total cost of ownership</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                What this actually costs in year one.
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
                {override.costBreakdown.intro}
              </p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                      <th className="px-4 py-3">Cost head</th>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Typical range</th>
                      <th className="px-4 py-3">In {feeFormatted} fee?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {override.costBreakdown.rows.map((row) => (
                      <tr key={row.item} className="border-b border-slate-200 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-700">{row.item}</td>
                        <td className="px-4 py-3 text-slate-600">{row.when}</td>
                        <td className="px-4 py-3 text-slate-600">{row.range}</td>
                        <td className="px-4 py-3 text-slate-600">{row.includedInFee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">{override.costBreakdown.note}</p>
            </section>
          ) : null}
          {relatedServices.length ? (
            <section>
              <p className="marketing-kicker">{service.categoryName}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Related services in this category.
              </h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {relatedServices.map((related) => (
                  <Link
                    key={related.id}
                    href={`/services/${related.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-800 hover:border-pink-300 hover:text-pink-700"
                  >
                    {related.name}
                    <ArrowRight className="size-4 shrink-0 text-slate-400 group-hover:translate-x-1 group-hover:text-pink-700" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {relatedGuides.length ? (
            <section>
              <p className="marketing-kicker">Read next</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Guides that cover this in more depth.
              </h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {relatedGuides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/resources/${guide.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-800 hover:border-pink-300 hover:text-pink-700"
                  >
                    {guide.title}
                    <ArrowRight className="size-4 shrink-0 text-slate-400 group-hover:translate-x-1 group-hover:text-pink-700" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <Link
            href="/pricing"
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-700 hover:border-pink-300 hover:text-pink-700"
          >
            Compare all service fees <ArrowRight className="size-4" />
          </Link>
        </main>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Services", item: getAppUrl("/services") },
            {
              "@type": "ListItem",
              position: 2,
              name: service.categoryName,
              item: getAppUrl("/services"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: service.name,
              item: getAppUrl(`/services/${service.slug}`),
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          description: content.summary,
          provider: { "@type": "Organization", name: "FirstMan Corporate Services" },
          areaServed: "India",
          offers: {
            "@type": "Offer",
            price: (service.basePricePaise / 100).toFixed(2),
            priceCurrency: "INR",
            url: getAppUrl(`/services/${service.slug}`),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
      {override ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: `How to complete ${service.name}`,
            step: content.process.map((step) => ({
              "@type": "HowToStep",
              name: step.title,
              text: step.body,
            })),
          }}
        />
      ) : null}
    </div>
  );
}
