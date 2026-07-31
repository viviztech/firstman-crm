export type ResourceSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type ResourceArticle = {
  slug: string;
  title: string;
  /** Meta description and card summary. */
  description: string;
  pillarSlug: string;
  isPillar: boolean;
  publishedAt: string;
  updatedAt: string;
  author: string;
  /** Answer-first paragraph for AEO/GEO extractability. */
  summary: string;
  sections: ResourceSection[];
  relatedServiceSlugs?: string[];
  relatedArticleSlugs?: string[];
};

export const AUTHOR = "FirstMan Corporate Services Team";
