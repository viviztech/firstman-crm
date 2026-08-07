import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

/**
 * GEO crawler policy (marketing site plan §6): explicitly allow retrieval/citation bots so
 * FirstMan can show up inside AI answers, while the CRM's authenticated routes stay closed
 * to everyone. Training-only crawlers are allowed too — there's nothing proprietary on the
 * public site worth protecting, and visibility matters more than caution for a lead-gen site.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/dashboard",
    "/enquiries",
    "/clients",
    "/orders",
    "/catalog",
    "/compliance",
    "/invoices",
    "/expenses",
    "/reports",
    "/settings",
    "/login",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: getAppUrl("/sitemap.xml"),
  };
}
