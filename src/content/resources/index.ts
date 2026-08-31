import { ANNUAL_COMPLIANCE_ARTICLES } from "@/content/resources/annual-compliance";
import { COMPANY_REGISTRATION_ARTICLES } from "@/content/resources/company-registration";
import type { ResourceArticle } from "@/content/resources/types";

export type { ResourceArticle, ResourceSection } from "@/content/resources/types";

export const ALL_ARTICLES: ResourceArticle[] = [
  ...COMPANY_REGISTRATION_ARTICLES,
  ...ANNUAL_COMPLIANCE_ARTICLES,
];

export const PILLARS: ResourceArticle[] = ALL_ARTICLES.filter((article) => article.isPillar);

export function getArticleBySlug(slug: string): ResourceArticle | undefined {
  return ALL_ARTICLES.find((article) => article.slug === slug);
}

export function getClusterArticles(pillarSlug: string): ResourceArticle[] {
  return ALL_ARTICLES.filter((article) => article.pillarSlug === pillarSlug && !article.isPillar);
}

export function resolveRelatedArticles(article: ResourceArticle): ResourceArticle[] {
  if (!article.relatedArticleSlugs) return [];
  return article.relatedArticleSlugs
    .map((slug) => getArticleBySlug(slug))
    .filter((related): related is ResourceArticle => Boolean(related));
}

/** Reverse lookup of resolveRelatedArticles' service direction — guides that reference a given service, for the service page's "Related guides" back-link. */
export function getArticlesForService(serviceSlug: string): ResourceArticle[] {
  return ALL_ARTICLES.filter((article) => article.relatedServiceSlugs?.includes(serviceSlug));
}
