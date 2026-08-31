import type { Metadata } from "next";

const SITE_NAME = "FirstMan Corporate Services";
const DEFAULT_OG_IMAGE = "/brand/firstman-logo.png";

/**
 * Builds a marketing page's metadata: canonical, Open Graph, and Twitter Card all in one
 * place. `title` should be the raw page title with no "| FirstMan" suffix — the root
 * layout's `title.template` appends that once; adding it here would double it.
 */
export function buildMarketingMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
