import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/content/comparisons";
import { ALL_ARTICLES } from "@/content/resources";
import { getAppUrl } from "@/lib/app-url";
import { getPublicServices } from "@/services/marketing-catalog";

export const revalidate = 3600;

// /legal/privacy and /legal/terms are deliberately excluded — both are noindex (draft
// placeholder content), and listing a noindex URL in the sitemap sends Google a mixed signal.
const STATIC_ROUTES = [
  "/",
  "/services",
  "/pricing",
  "/about",
  "/contact",
  "/compare",
  "/resources",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await getPublicServices();

  // Static and comparison routes have no genuine per-page freshness signal to report, so
  // lastModified is omitted for them rather than stamped with today's date on every build.
  const staticEntries = STATIC_ROUTES.map((path) => ({ url: getAppUrl(path) }));
  const compareEntries = COMPARISONS.map((comparison) => ({
    url: getAppUrl(`/compare/${comparison.slug}`),
  }));
  const serviceEntries = services.map((service) => ({
    url: getAppUrl(`/services/${service.slug}`),
    lastModified: service.updatedAt,
  }));
  const resourceEntries = ALL_ARTICLES.map((article) => ({
    url: getAppUrl(`/resources/${article.slug}`),
    lastModified: new Date(article.updatedAt),
  }));

  return [...staticEntries, ...serviceEntries, ...compareEntries, ...resourceEntries];
}
