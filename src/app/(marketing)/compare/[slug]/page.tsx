import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/marketing/json-ld";
import { COMPARISONS, getComparisonBySlug } from "@/content/comparisons";
import { formatMoney } from "@/lib/money";
import { getPublicServiceBySlug } from "@/services/marketing-catalog";

export async function generateStaticParams() {
  return COMPARISONS.map((comparison) => ({ slug: comparison.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) return {};

  return {
    title: `${comparison.title} — FirstMan Corporate Services`,
    description: comparison.description,
  };
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) notFound();

  const [serviceA, serviceB] = await Promise.all([
    getPublicServiceBySlug(comparison.entityA.serviceSlug),
    getPublicServiceBySlug(comparison.entityB.serviceSlug),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/compare" className="hover:text-foreground">
          Compare
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{comparison.title}</span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{comparison.title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{comparison.summary}</p>

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">&nbsp;</th>
              <th className="px-4 py-3 font-medium">{comparison.entityA.name}</th>
              <th className="px-4 py-3 font-medium">{comparison.entityB.name}</th>
            </tr>
          </thead>
          <tbody>
            {comparison.attributes.map((attribute) => (
              <tr key={attribute.label} className="border-b last:border-0 align-top">
                <td className="px-4 py-3 font-medium text-muted-foreground">{attribute.label}</td>
                <td className="px-4 py-3">{attribute.valueA}</td>
                <td className="px-4 py-3">{attribute.valueB}</td>
              </tr>
            ))}
            {serviceA || serviceB ? (
              <tr className="border-t bg-muted/20 align-top">
                <td className="px-4 py-3 font-medium text-muted-foreground">Starting price</td>
                <td className="px-4 py-3 font-semibold">
                  {serviceA ? formatMoney(serviceA.basePricePaise) : "—"}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {serviceB ? formatMoney(serviceB.basePricePaise) : "—"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Choose {comparison.entityA.name} if…</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{comparison.verdict.forA}</p>
          <Link
            href={`/services/${comparison.entityA.serviceSlug}`}
            className="text-brand mt-3 inline-block text-sm font-semibold hover:underline"
          >
            {comparison.entityA.name} details →
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Choose {comparison.entityB.name} if…</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{comparison.verdict.forB}</p>
          <Link
            href={`/services/${comparison.entityB.serviceSlug}`}
            className="text-brand mt-3 inline-block text-sm font-semibold hover:underline"
          >
            {comparison.entityB.name} details →
          </Link>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-bold">Frequently asked questions</h2>
        <div className="flex flex-col divide-y">
          {comparison.faqs.map((faq) => (
            <div key={faq.question} className="py-4">
              <h3 className="font-semibold">{faq.question}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-semibold">Still not sure which one fits?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your business and we'll recommend a structure — no obligation.
        </p>
        <Link
          href="/contact"
          className="bg-brand text-brand-foreground hover:bg-brand/90 mt-4 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors"
        >
          Ask us
        </Link>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: comparison.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
    </div>
  );
}
