import { NextResponse } from "next/server";
import { COMPARISONS } from "@/content/comparisons";
import { getClusterArticles, PILLARS } from "@/content/resources";
import { getAppUrl } from "@/lib/app-url";
import { formatMoney } from "@/lib/money";
import { getCompanyProfile } from "@/services/company-profile";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const revalidate = 3600;

/**
 * Plain-text index for LLMs (emerging llms.txt convention) — generated from the same DB
 * the pricing page reads, so it can't drift out of sync the way a hand-maintained file would.
 */
export async function GET(): Promise<NextResponse> {
  const [profile, catalog] = await Promise.all([getCompanyProfile(), getPublicCatalog()]);

  const lines: string[] = [
    `# ${profile.name}`,
    "",
    `> Company registration, GST, trademarks, licenses, and compliance services, serving ${profile.areasServed}.`,
    "",
    `Website: ${getAppUrl("/")}`,
    `Pricing: ${getAppUrl("/pricing")}`,
    `Contact: ${getAppUrl("/contact")}`,
    "",
    "## Services",
    "",
  ];

  for (const vertical of catalog) {
    lines.push(`### ${vertical.name}`, "");
    for (const category of vertical.categories) {
      lines.push(`#### ${category.name}`, "");
      for (const service of category.services) {
        const fee = service.govtFeePaise
          ? `${formatMoney(service.basePricePaise)} + ${formatMoney(service.govtFeePaise)} govt. fee`
          : formatMoney(service.basePricePaise);
        lines.push(
          `- [${service.name}](${getAppUrl(`/services/${service.slug}`)}): ${fee}, ~${service.estimatedDays} business days`,
        );
      }
      lines.push("");
    }
  }

  lines.push("## Compare business structures", "");
  for (const comparison of COMPARISONS) {
    lines.push(`- [${comparison.title}](${getAppUrl(`/compare/${comparison.slug}`)})`);
  }
  lines.push("");

  lines.push("## Guides", "");
  for (const pillar of PILLARS) {
    lines.push(`### ${pillar.title}`, "", `${getAppUrl(`/resources/${pillar.slug}`)}`, "");
    for (const article of getClusterArticles(pillar.pillarSlug)) {
      lines.push(`- [${article.title}](${getAppUrl(`/resources/${article.slug}`)})`);
    }
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
