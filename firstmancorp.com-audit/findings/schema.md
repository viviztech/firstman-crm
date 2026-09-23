# Structured Data (Schema.org) Audit — firstmancorp.com

Audit date: 2026-08-31
Pages sampled directly (rendered via `render_page.py --mode auto --json`, `structured_data` field + full JSON-LD dump): `/`, `/services`, `/services/pvt-ltd-registration`, `/services/gst-registration`, `/pricing`, `/about`, `/contact`, `/compare`, `/compare/private-limited-vs-llp`, `/resources/company-registration-in-india`, `/resources/what-is-dir-3-kyc`. All rendered raw (server-rendered HTML, `is_spa: false`), so what's detected is exactly what Googlebot sees without needing JS execution.

## Category Score: 55 / 100

The site already does more than most SMB marketing sites (real `Service`/`Offer` schema with live pricing on ~85 service pages, `Article` schema on resource guides, sitewide `Organization`), but a single structural defect (`address` as a bare string instead of `PostalAddress`) is duplicated across all ~101 pages, there's no `LocalBusiness`/`ProfessionalService` typing despite a real single-location address, zero `BreadcrumbList` anywhere despite a deep `/services/<slug>` hierarchy, and `Article` blocks are missing the `image` property Google lists as required for Article eligibility.

---

## What Works

- **Valid JSON-LD everywhere sampled** — every block on every page returned `"valid": true`, correct `@context: "https://schema.org"`, no HTTP context, no obvious syntax errors.
- **`Service` + `Offer` schema on service detail pages** (confirmed on `/services/pvt-ltd-registration`, `/services/gst-registration`) — includes `name`, `description`, `provider`, `areaServed`, and a nested `Offer` with real `price` + `priceCurrency: "INR"` pulled from the live catalog. This is clearly generated server-side from the same service-catalog data described in the CRM spec (§4.3) — good architecture, just needs a few more properties.
- **`Article` schema on `/resources/<slug>` guides** — `headline`, `description`, `author` (Organization), `datePublished`, `dateModified` (ISO 8601, correct), `mainEntityOfPage`. Dates are real and distinct per article, not boilerplate.
- **Sitewide `Organization` block is centrally injected** (identical 447-byte block on every page type checked, root-layout level) — good for consistency; fixing it once fixes it everywhere.
- **`taxID` (GSTIN) and `identifier`/`PropertyValue` (LLPIN) correctly modeled** — legitimate, accurate use of these properties for an Indian LLP.
- **FAQPage already present on service pages and compare pages** — well-formed `Question`/`acceptedAnswer` pairs, genuinely relevant Q&A content (not stuffed). Per current guidance this earns no Google SERP feature (FAQ rich results were retired for all sites 2026-05-07) — flagged as Info below, not a defect, and not something to rip out.

---

## Findings

### 1. `address` is a bare string, not a `PostalAddress` object (Critical, sitewide — ~101 pages)
**Evidence:** every sampled page's `Organization` block:
```json
"address": "W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West, Chennai - 600 101"
```
Per schema.org, `Organization.address` expects a `PostalAddress` (or text is technically tolerated but loses all machine-readable value — street/locality/region/postal code aren't parseable). This blocks any Local Business knowledge-panel or map-pack eligibility and is the single highest-leverage fix since it's emitted from one shared component.
**Recommendation:** Convert to a structured `PostalAddress`. See snippet #1 below.

### 2. Organization type should be `ProfessionalService` (or `LocalBusiness`), not generic `Organization` (High, sitewide)
**Evidence:** `@type": "Organization"` on every page, despite `context.md` confirming a real single physical office in Chennai and services delivered to walk-in/local clients as well as remote ones.
**Recommendation:** Switch the sitewide block to `ProfessionalService` (a `LocalBusiness` subtype) with `address`, `geo` (optional), and `priceRange`. `ProfessionalService` is the correct fit for a corporate-services/CA-style firm — better than generic `LocalBusiness` and much better than bare `Organization`.

### 3. No `contactPoint`/`telephone` anywhere, and no phone number found on `/contact` at all (High)
**Evidence:** Checked `/contact` raw HTML for `tel:`/`mailto:` links and phone-shaped text — none found; the page is a bare contact form with no visible phone number or email in the markup (only a placeholder `you@example.com` in an unfilled input).
**Recommendation:** This is a content gap as much as a schema gap — a `ProfessionalService` without any way to phone/email the business is a weak Local Business candidate regardless of markup. If a support phone/email exists in `settings` (company profile, per CRM spec §4.10), surface it on `/contact` and add a `contactPoint` block referencing it.

### 4. No `BreadcrumbList` anywhere (High, sitewide — ~85 service pages + compare/resources)
**Evidence:** Not present in any of the 9 sampled pages, including the 3-level-deep `/services/<slug>` pages.
**Recommendation:** Since every `/services/<slug>`, `/resources/<slug>`, and `/compare/<slug>` page is already server-rendered from route params, breadcrumbs can be derived from the URL segment + page title with a single shared component (e.g. `src/components/seo/breadcrumb-jsonld.tsx`) reused across all three route groups. See snippet #2.

### 5. `Article` blocks missing `image` (required by Google for Article rich-result eligibility) and `publisher` (High, 10 `/resources/<slug>` pages)
**Evidence:** `/resources/company-registration-in-india` and `/resources/what-is-dir-3-kyc` both have `headline`, `author`, `datePublished`, `dateModified`, `mainEntityOfPage` — but no `image` and no `publisher`. Google's Article structured-data guidelines list `image` as a required property; without it the page isn't eligible for Article-type search enhancements at all, regardless of how complete the rest of the block is.
**Recommendation:** Add `image` (article hero/OG image, absolute URL, ≥1200px wide per Google's guidance) and a `publisher` object (Organization + logo, mirroring the sitewide block) to the existing Article generator. Low-effort since `author`/dates are already wired up from the same content source.

### 6. `/compare/<slug>` pages have no page-type schema at all — only inherited FAQPage + Organization (Medium, 3 pages)
**Evidence:** `/compare/private-limited-vs-llp` has an `FAQPage` block (3 well-formed Q&As) and the sitewide `Organization` block, but nothing describing the comparison content itself — no `Article`, no `WebPage`, no `headline`/`datePublished`.
**Recommendation:** These are long-form comparison guides (structurally identical to `/resources/<slug>`) — reuse the same `Article` generator used for resources rather than inventing a new type. Schema.org has no dedicated "comparison" type; `Article` with a descriptive `headline` (e.g. "Private Limited vs LLP: Which Should You Register?") is the correct, boring, effective choice.

### 7. `/pricing`, `/about`, `/services` (hub) carry zero page-specific schema (Medium)
**Evidence:** All three return only the sitewide `Organization` block — no `ItemList`/`OfferCatalog` on `/pricing` despite it presumably listing the same live per-service prices used to build the 85 individual `Offer` blocks; no `ItemList` of services on the `/services` hub for site-structure signals; no expanded `Organization` (founders, `foundingDate`, `numberOfEmployees`) on `/about`.
**Recommendation:** Lowest priority of the set — worth doing after items 1-5, but an `ItemList` on `/pricing`/`/services` (linking to each `Service`'s `@id`) is realistic since it's just iterating the same catalog query already powering the individual `Offer` blocks.

### 8. Existing `FAQPage` on service + compare pages (Info, not a defect)
**Evidence:** Present and well-formed on `/services/pvt-ltd-registration`, `/services/gst-registration`, `/compare/private-limited-vs-llp`.
**Note:** Google retired FAQ rich results for all sites (2026-05-07); this markup currently earns no SERP feature. It is not harmful and any AI/GEO-surface benefit is unconfirmed — leave as-is, do not invest further effort expanding FAQ content for SEO purposes specifically, and do not treat its absence elsewhere as a gap to fill.

### 9. Offer `price` formatted as a string with trailing `.00` (Info)
**Evidence:** `"price": "10999.00"` — valid per spec (string or number both accepted) but inconsistent with typical machine-parsing expectations; a plain number (`10999.00` unquoted, or integer `10999` if no paise) is cleaner and matches how the CRM already stores `amountPaise` internally.

---

## Generated JSON-LD — Top Recommendations

### Snippet 1 — Sitewide `Organization` → `ProfessionalService` with structured address + contactPoint
Replace the single shared block (used on every page) with:
```json
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://firstmancorp.com/#organization",
  "name": "FirstMan Corporate Services",
  "legalName": "FirstMan Corporate Services LLP",
  "url": "https://firstmancorp.com/",
  "logo": "https://firstmancorp.com/brand/firstman-logo.png",
  "image": "https://firstmancorp.com/brand/firstman-logo.png",
  "areaServed": "Tamil Nadu",
  "priceRange": "₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "W-426A, Second Floor, 2nd Avenue",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "600101",
    "addressCountry": "IN"
  },
  "taxID": "33AAFFF0744H1ZS",
  "identifier": {
    "@type": "PropertyValue",
    "name": "LLPIN",
    "value": "AAI-5319"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "areaServed": "IN",
    "availableLanguage": ["en", "ta"]
  }
}
```
Note: `contactPoint.telephone`/`email` are intentionally omitted above pending Finding #3 — add them once a real public phone/email is surfaced on `/contact`; do not fabricate placeholder values (violates "no placeholder text" validation rule).

### Snippet 2 — `BreadcrumbList` for `/services/<slug>` (adapt path segments for `/resources/<slug>` and `/compare/<slug>`)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://firstmancorp.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://firstmancorp.com/services"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Private Limited Company",
      "item": "https://firstmancorp.com/services/pvt-ltd-registration"
    }
  ]
}
```
Implementation note: since services already come from a DB-backed catalog (`services.name`, `services.slug`, `service_categories.name`), this can be generated in the same server component that emits the existing `Service`/`Offer` block, using `service_categories.name` as the position-2 label if a category-level page exists, or the static "Services" hub otherwise.

### Snippet 3 — `Article` fix for `/resources/<slug>` (add `image` + `publisher`)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Company Registration in India: The Complete Guide",
  "description": "Everything you need to know about registering a business in India — structures, documents, cost, and timeline.",
  "image": "https://firstmancorp.com/resources/company-registration-in-india/cover.jpg",
  "author": {
    "@type": "Organization",
    "name": "FirstMan Corporate Services Team",
    "url": "https://firstmancorp.com/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "FirstMan Corporate Services",
    "logo": {
      "@type": "ImageObject",
      "url": "https://firstmancorp.com/brand/firstman-logo.png"
    }
  },
  "datePublished": "2026-06-02",
  "dateModified": "2026-07-15",
  "mainEntityOfPage": "https://firstmancorp.com/resources/company-registration-in-india"
}
```
If no per-article hero image currently exists in the resources content model, the sitewide OG/social-share image is an acceptable interim fallback — but a real per-article image is preferable for eligibility quality.

---

## Priority Summary

| # | Finding | Severity | Pages affected |
|---|---|---|---|
| 1 | `address` as string, not `PostalAddress` | Critical | ~101 (sitewide) |
| 2 | `Organization` → should be `ProfessionalService` | High | ~101 (sitewide) |
| 3 | No `contactPoint`/telephone; no phone visible on site | High | ~101 (sitewide) + content gap |
| 4 | No `BreadcrumbList` | High | ~90 (services/resources/compare) |
| 5 | `Article` missing required `image`, missing `publisher` | High | 10 (`/resources/<slug>`) |
| 6 | `/compare/<slug>` has no `Article`/`WebPage` schema | Medium | 3 |
| 7 | `/pricing`, `/about`, `/services` hub have no page-specific schema | Medium | 3 |
| 8 | `FAQPage` present, no current SERP benefit | Info | ~88 |
| 9 | `Offer.price` as string with `.00` | Info | ~85 |
