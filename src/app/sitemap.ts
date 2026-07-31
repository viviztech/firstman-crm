import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";
import { getPublicCatalog } from "@/services/marketing-catalog";

export const revalidate = 3600;

const STATIC_ROUTES = ["/", "/services", "/pricing", "/about", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getPublicCatalog();
  const serviceRoutes = catalog.flatMap((category) =>
    category.services.map((service) => `/services/${service.slug}`),
  );

  return [...STATIC_ROUTES, ...serviceRoutes].map((path) => ({
    url: getAppUrl(path),
    lastModified: new Date(),
  }));
}
