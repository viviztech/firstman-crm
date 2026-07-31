import type { Metadata } from "next";
import Link from "next/link";
import { getClusterArticles, PILLARS } from "@/content/resources";

export const metadata: Metadata = {
  title: "Resources — FirstMan Corporate Services",
  description:
    "Guides on company registration and annual compliance in India — written from what we actually file for clients.",
};

export default function ResourcesHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Resources</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Guides on registration and compliance, written from what we actually file for clients —
          not generic filler.
        </p>
      </div>

      <div className="flex flex-col gap-14">
        {PILLARS.map((pillar) => {
          const clusters = getClusterArticles(pillar.pillarSlug);
          return (
            <section key={pillar.slug}>
              <Link href={`/resources/${pillar.slug}`} className="group">
                <h2 className="group-hover:text-brand text-xl font-bold transition-colors">
                  {pillar.title}
                </h2>
                <p className="mt-1.5 text-muted-foreground">{pillar.description}</p>
              </Link>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {clusters.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/resources/${article.slug}`}
                    className="hover:border-brand/40 group flex flex-col gap-1.5 rounded-xl border bg-card p-4 transition-colors"
                  >
                    <h3 className="group-hover:text-brand text-sm font-semibold transition-colors">
                      {article.title}
                    </h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {article.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
