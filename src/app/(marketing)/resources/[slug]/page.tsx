import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/marketing/json-ld";
import {
  ALL_ARTICLES,
  getArticleBySlug,
  getClusterArticles,
  resolveRelatedArticles,
} from "@/content/resources";
import { getAppUrl } from "@/lib/app-url";
import { getPublicCatalog } from "@/services/marketing-catalog";

export async function generateStaticParams() {
  return ALL_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: `${article.title} — FirstMan Corporate Services`,
    description: article.description,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "long" });
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const catalog = await getPublicCatalog();
  const allServices = catalog.flatMap((category) => category.services);
  const relatedServices = (article.relatedServiceSlugs ?? [])
    .map((serviceSlug) => allServices.find((s) => s.slug === serviceSlug))
    .filter((s): s is (typeof allServices)[number] => Boolean(s));

  const pillar = article.isPillar ? article : getArticleBySlug(article.pillarSlug);
  const siblingClusters = getClusterArticles(article.pillarSlug).filter(
    (a) => a.slug !== article.slug,
  );
  const relatedArticles = resolveRelatedArticles(article).filter((a) => a.slug !== pillar?.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/resources" className="hover:text-foreground">
          Resources
        </Link>
        {!article.isPillar && pillar ? (
          <>
            <span className="mx-2">/</span>
            <Link href={`/resources/${pillar.slug}`} className="hover:text-foreground">
              {pillar.title}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{article.title}</span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{article.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        By {article.author} · Published {formatDate(article.publishedAt)}
        {article.updatedAt !== article.publishedAt
          ? ` · Updated ${formatDate(article.updatedAt)}`
          : ""}
      </p>

      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{article.summary}</p>

      <div className="mt-8 flex flex-col gap-8">
        {article.sections.map((section) => (
          <section key={section.heading ?? section.paragraphs?.[0] ?? section.bullets?.[0]}>
            {section.heading ? <h2 className="mb-2 text-lg font-bold">{section.heading}</h2> : null}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {relatedServices.length > 0 ? (
        <div className="mt-10 flex flex-wrap gap-2 border-t pt-6">
          {relatedServices.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="hover:bg-muted rounded-full border px-3 py-1.5 text-xs font-medium"
            >
              {service.name} →
            </Link>
          ))}
        </div>
      ) : null}

      {!article.isPillar && siblingClusters.length > 0 ? (
        <aside className="mt-10 rounded-xl border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold">More in this guide</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {siblingClusters.map((sibling) => (
              <li key={sibling.slug}>
                <Link
                  href={`/resources/${sibling.slug}`}
                  className="text-brand text-sm font-medium hover:underline"
                >
                  {sibling.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {relatedArticles.length > 0 ? (
        <aside className="mt-6 rounded-xl border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold">Related reading</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {relatedArticles.map((related) => (
              <li key={related.slug}>
                <Link
                  href={`/resources/${related.slug}`}
                  className="text-brand text-sm font-medium hover:underline"
                >
                  {related.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <div className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="font-semibold">Have a specific question?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every business is a little different — tell us yours and we'll give you a straight answer.
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
          "@type": "Article",
          headline: article.title,
          description: article.description,
          author: { "@type": "Organization", name: article.author },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          mainEntityOfPage: getAppUrl(`/resources/${article.slug}`),
        }}
      />
    </div>
  );
}
