import type { Metadata } from "next";
import Link from "next/link";
import { COMPARISONS } from "@/content/comparisons";
import { buildMarketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Compare business structures",
  description:
    "Private Limited, LLP, OPC, and Proprietorship compared side by side — liability, compliance, funding, and cost.",
  path: "/compare",
});

export default function CompareHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Which structure is right for you?
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Straight comparisons — no jargon, no upsell, just what each structure actually means for
          liability, funding, and how much paperwork you'll deal with every year.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {COMPARISONS.map((comparison) => (
          <Link
            key={comparison.slug}
            href={`/compare/${comparison.slug}`}
            className="hover:border-brand/40 group flex flex-col gap-1.5 rounded-xl border bg-card p-5 transition-colors"
          >
            <h2 className="group-hover:text-brand font-semibold transition-colors">
              {comparison.title}
            </h2>
            <p className="text-sm text-muted-foreground">{comparison.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
