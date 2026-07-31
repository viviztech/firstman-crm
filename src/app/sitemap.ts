import type { MetadataRoute } from "next";
import { COMPARISONS } from "@/content/comparisons";
import { ALL_ARTICLES } from "@/content/resources";
import { getAppUrl } from "@/lib/app-url";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const revalidate = 3600;

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
  const catalog = await getPublicCatalog();
  const serviceRoutes = catalog.flatMap((category) =>
    category.services.map((service) => `/services/${service.slug}`),
  );
  const compareRoutes = COMPARISONS.map((comparison) => `/compare/${comparison.slug}`);
  const resourceRoutes = ALL_ARTICLES.map((article) => `/resources/${article.slug}`);

  return [...STATIC_ROUTES, ...serviceRoutes, ...compareRoutes, ...resourceRoutes].map((path) => ({
    url: getAppUrl(path),
    lastModified: new Date(),
  }));
}
