import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingEnquiryForm } from "@/components/marketing/enquiry-form";
import { JsonLd } from "@/components/marketing/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import { getPublicServiceBySlug, getPublicServices } from "@/services/marketing-catalog";

export async function generateStaticParams() {
  const services = await getPublicServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);
  if (!service) return {};

  const description =
    service.description ??
    `${service.name} starting at ${formatMoney(service.basePricePaise)}, typically ${service.estimatedDays} business days.`;

  return {
    title: `${service.name} — FirstMan Corporate Services`,
    description,
  };
}

function recurrenceLabel(recurrence: "monthly" | "quarterly" | "yearly" | null): string | null {
  if (!recurrence) return null;
  return `Filed ${recurrence}`;
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [service, allServices] = await Promise.all([
    getPublicServiceBySlug(slug),
    getPublicServices(),
  ]);
  if (!service) notFound();

  const totalFromPaise = service.basePricePaise + (service.govtFeePaise ?? 0);

  const faqs = [
    {
      question: `How much does ${service.name} cost?`,
      answer: service.govtFeePaise
        ? `${service.name} starts at ${formatMoney(service.basePricePaise)} in professional fees plus ${formatMoney(service.govtFeePaise)} in government fees — ${formatMoney(totalFromPaise)} all-in.`
        : `${service.name} starts at ${formatMoney(service.basePricePaise)}.`,
    },
    {
      question: "How long does it take?",
      answer: `Typically ${service.estimatedDays} business days from when we have everything we need from you.`,
    },
    {
      question: "What documents do I need to provide?",
      answer:
        service.requiredDocuments.length > 0
          ? `You'll need: ${service.requiredDocuments.join(", ")}.`
          : "We'll share the exact document checklist once you get in touch.",
    },
    ...(service.isRecurring
      ? [
          {
            question: "Is this a one-time or recurring filing?",
            answer: `This is filed ${service.recurrence} — we'll remind you ahead of every due date so nothing is missed.`,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/services" className="hover:text-foreground">
          Services
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{service.name}</span>
      </nav>

      <span className="text-brand text-sm font-semibold uppercase tracking-wide">
        {service.categoryName}
      </span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{service.name}</h1>

      {/* Answer-first block for AEO/GEO extractability — direct answer before any marketing copy. */}
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {service.name} through FirstMan starts at {formatMoney(service.basePricePaise)}
        {service.govtFeePaise
          ? ` plus ${formatMoney(service.govtFeePaise)} in government fees`
          : ""}
        , and typically takes {service.estimatedDays} business days.
        {recurrenceLabel(service.recurrence) ? ` ${recurrenceLabel(service.recurrence)}.` : ""}
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-10">
          {service.description ? (
            <section>
              <h2 className="mb-2 text-lg font-bold">About this service</h2>
              <p className="text-muted-foreground">{service.description}</p>
            </section>
          ) : null}

          {service.requiredDocuments.length > 0 ? (
            <section>
              <h2 className="mb-3 text-lg font-bold">Documents you'll need</h2>
              <ul className="flex flex-col gap-2">
                {service.requiredDocuments.map((doc) => (
                  <li key={doc} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="text-brand mt-0.5 size-4 shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-lg font-bold">Frequently asked questions</h2>
            <div className="flex flex-col divide-y">
              {faqs.map((faq) => (
                <div key={faq.question} className="py-4">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Starting from</p>
              <p className="text-2xl font-extrabold">{formatMoney(service.basePricePaise)}</p>
              {service.govtFeePaise ? (
                <p className="text-sm text-muted-foreground">
                  + {formatMoney(service.govtFeePaise)} govt. fees
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                ~{service.estimatedDays} business days
              </p>
            </div>
            <MarketingEnquiryForm
              services={allServices.map((s) => ({ id: s.id, name: s.name }))}
              defaultServiceId={service.id}
            />
          </div>
        </aside>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          description: service.description ?? undefined,
          provider: { "@type": "Organization", name: "FirstMan Corporate Services" },
          areaServed: "Tamil Nadu",
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
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
    </div>
  );
}
