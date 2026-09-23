# Full SEO Audit — firstmancorp.com

**Site**: FirstMan Corporate Services LLP — Indian corporate-services firm (company registration, GST, compliance, trademarks, ISO/FSSAI licensing), single office in Chennai, Tamil Nadu.
**Scope**: the public marketing site only (101 URLs from sitemap.xml). The authenticated CRM/admin app and customer portal are correctly excluded via robots.txt and were not audited (out of scope for SEO).
**Business type**: Professional / local service, hybrid — real physical office, but much of the business happens remotely across Tamil Nadu.

## Executive Summary

### Overall SEO Health Score: 56 / 100

Weighted across the 7 standard categories (Technical 22%, Content 23%, On-Page 20%, Schema 10%, Performance 10%, AI Search 10%, Images 5%). Supplementary categories (Local SEO, Search Experience/SXO, Visual/UX, Sitemap detail, Backlinks) are reported separately below — material for this business but not part of the weighted formula.

The site has a genuinely solid technical and structured-data *foundation* (server-rendered Next.js, valid sitemap, Service/Offer/FAQPage/Article schema already generated from the catalog database, correct robots.txt, full caching) — but it's undercut by a handful of **site-wide template bugs** that are each a single fix away from resolution, plus a **content-architecture problem** (thin, near-duplicate service pages with almost no internal linking between related topics) that will take more sustained work.

### Top 5 Critical/High Issues

1. **No canonical tag anywhere** (Critical) — 101 pages, no self-referencing canonicals, real duplicate-content risk across ~85 near-identical service pages.
2. **No phone number anywhere on the site** (Critical) — no tel: links, not in header/footer/contact, not in schema. A serious trust and conversion gap for a compliance-services firm.
3. **Government-fee amounts missing** (Critical) — null in both page copy and Offer schema, on pages specifically targeting cost-intent queries.
4. **Duplicated title suffix** (High) — "... | FirstMan | FirstMan" on ~99 pages, a metadata-template bug.
5. **Near-zero internal linking between related pages** (High) — e.g. the ISO Certification pillar page links to none of its 8 variant pages.

### Top 5 Quick Wins

1. Fix the title-suffix duplication bug — one shared-layout fix, ~99 pages.
2. Add self-referencing canonicals — one shared-layout fix, all 101 pages.
3. Add a phone number + contactPoint schema.
4. Add government-fee line items to the price block + Offer schema.
5. Link the ISO Certification pillar page to its 8 variants; add reciprocal links from Annual Compliance service pages back to their pillar guide.

---

## Technical SEO — Score: 67/100

**What works**: correct robots.txt (only internal CRM paths disallowed), valid sitemap with 1:1 parity to the real site structure and zero orphans/dead links, clean single-hop redirects, real 404s, consistent security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) including on error pages, fully server-rendered HTML with no SPA shell, single H1 per page, viewport meta everywhere.

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| Critical | No canonical tag on any of 101 pages | Add self-referencing canonical in the shared metadata generator |
| High | Title tag duplicated: "... \| FirstMan \| FirstMan" on ~99 pages | Fix the title-template layering bug in the shared layout |
| Medium | No Open Graph / Twitter Card tags anywhere | Add OG/Twitter tags to shared layout, reuse existing logo |
| Medium | No BreadcrumbList schema despite deep hierarchy | Add one reusable BreadcrumbList component |
| Low | /services hub links only 81 of 85 detail pages (orphan risk) | Audit the hub's catalog query for the 4 missing entries |
| Low | 2-hop www redirect; X-Powered-By disclosed; no Permissions-Policy header | Minor hardening — collapse redirect, strip header, add Permissions-Policy |

### Sitemap detail — Score: 78/100
- All 101 URLs valid, 1:1 parity confirmed with actual site structure (81/81 services, 3/3 compare, 10/10 resources), no 404s among spot-checks.
- **Medium**: `/legal/privacy` and `/legal/terms` are live (200 OK) and footer-linked but missing from the sitemap.
- **Medium**: All 101 `lastmod` values are identical — a deploy-time artifact providing no real recrawl-priority signal.

---

## Content Quality — Score: 46/100

**What works**: `/compare/<slug>` pages lead with genuine synthesized recommendations rather than bare tables; resource articles show real, visible publish/update dates; service-page FAQs carry specific, citable cost/turnaround facts.

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| High | Verbatim boilerplate reused across unrelated services (confirmed: DSC and ISO-27001 pages open with identical sentences except the service name) | Add a 150-200 word unique content block per service page, generated from existing catalog `checklistTemplate`/`requiredDocuments` fields |
| High | No E-E-A-T signals anywhere — no named/credentialed authors, no testimonials, no case studies | Add named CA/CS bylines to resource articles and flagship pages; add testimonials/case studies |
| Medium | No freshness signal on service pages (all show a deploy-date artifact, not real review dates) | Surface a real "Last reviewed" date tied to an actual review cadence |

*Methodology note: the content-quality audit's page-fetch tool truncated extracted text to 503 characters per page regardless of actual length, so findings are based on cross-page pattern comparison rather than verified full word counts. Directionally consistent with the codebase's known single-template architecture for `/services/<slug>` pages, but treat the exact score as provisional pending a re-check with untruncated text.*

---

## On-Page SEO — Score: 33/100

This category synthesizes the title/canonical defects above (Technical SEO) with a dedicated internal-linking/content-cluster analysis, since both are core on-page factors.

**What works**: consistent heading hierarchy per template family; basic header/footer navigation connects every page.

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| High | Topically related pages barely interlink. ISO Certification pillar (`/services/iso-certification`) links to **none** of its 8 variant pages — the single worst gap on the site. Annual Compliance is one-directional (guide → services, never back). GST and Tax Filing clusters have zero interlinking and no pillar page. | Add an "ISO standards" grid on the pillar page linking all 8 variants; clone the reciprocal-linking module already built on `/resources/annual-compliance-guide` onto its spokes; build simple pillar sections for GST and Tax Filing |
| High | Title-tag duplication and missing canonicals (see Technical SEO) are fundamentally on-page defects that determine what appears in search results | Same fix as Technical SEO |
| Medium | The 3 `/compare/<slug>` pages never cross-link each other or the business-structure resource guide, despite overlapping entities | Add a "Related comparisons" module |

---

## Schema & Structured Data — Score: 55/100

**What works**: `Service` + `Offer` schema with live INR pricing already implemented on all ~85 service pages, generated server-side from the same catalog DB the CRM uses; `Article` schema with real dates on the 10 resource guides; `FAQPage` on service and compare pages; all JSON-LD syntactically valid.

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| Critical | Organization `address` is a bare string, not a `PostalAddress` object (one shared component, all ~101 pages) | Convert to structured `PostalAddress` (streetAddress, addressLocality, addressRegion, postalCode, addressCountry) |
| High | `@type` is generic `Organization`, should be `ProfessionalService` | Change type in the same shared component; add geo/openingHours if available |
| High | No `contactPoint`/telephone in schema | Add once a phone number exists on-site |
| High | No `BreadcrumbList` schema anywhere | One reusable component across the 3 route groups |
| Medium | Article blocks missing `image` and `publisher` | Add both to the existing Article generator; reuse for `/compare/<slug>` too |
| Low | No page-specific schema on `/pricing`, `/about`, `/services` hub | Low priority — opportunistic |

Ready-to-adapt JSON-LD snippets for the top fixes are in `findings/schema.md`.

---

## Performance (Core Web Vitals) — Score: 78/100

*Lab-only estimates — no Google API/CrUX field data configured in this environment.*

**What works**: full static/ISR caching confirmed (`Cache-Control: s-maxage=31536000`, `X-Nextjs-Cache: HIT`); fonts self-hosted via `next/font` with `font-display: swap`; images via `next/image` with explicit dimensions (zero CLS risk); all JS async/non-blocking; the recently-added GA/GTM tags correctly use `strategy="afterInteractive"` rather than blocking hydration.

| Page | LCP (est.) | INP proxy (est.) | CLS (est.) |
|---|---|---|---|
| `/` | ~1.9–2.3s PASS | ~120–220ms borderline | ~0.01–0.03 PASS |
| `/services/annual-compliance-pvt-ltd` | ~2.0–2.4s PASS | ~130–230ms borderline | ~0.01–0.03 PASS |
| `/pricing` | ~2.0–2.5s PASS (closest to edge) | ~140–240ms borderline | ~0.01–0.02 PASS |

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| Medium | 114.6KB render-blocking global CSS on every page | Audit Tailwind content globs / dynamic class names for purge leaks |
| Medium | 177KB oversized shared JS chunk loaded on every route, including lightweight pages | Route-split so pages like `/pricing` don't pay its full cost |
| Info | All estimates pass but sit close to the ceiling on mobile/4G — unverifiable without real field data | Connect PSI/CrUX API credentials (Phase 4) |

---

## AI Search Readiness (GEO) — Score: 68/100

**What works**: robots.txt fully open to AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.); `/llms.txt` present and well-formed; all pages server-rendered with no JS wall; resource articles consistently open with a self-contained direct-answer sentence in the first ~40 words; `/compare/*` pages combine literal comparison tables with question-form FAQs — the strongest AI-citable content type on the site; visible + machine-readable dates on resource articles.

**Findings**:

| Severity | Finding | Recommendation |
|---|---|---|
| High | Resource guides likely under-schema'd for AI extraction — *note: this audit pass reported "no FAQPage/Article schema found" on sampled pages, which partially conflicts with the Schema audit's finding that FAQPage exists on the service/compare templates. The discrepancy most likely means the `/resources/<slug>` template specifically lacks it, rather than a sitewide absence — verify directly before treating either claim as final.* | Add FAQPage + complete Article schema (image, publisher) to the 10 resource guides regardless — low effort, high impact either way |
| Medium | Generic "FirstMan Team" byline, no named/credentialed author | Same fix as Content Quality E-E-A-T finding |
| Medium | Organization schema too thin for strong entity grounding | Same fix as Schema section |
| Info | `/llms.txt` appears to list only `/services/*`, not resources/compare | Low priority — expand opportunistically |

---

## Images — Score: 88/100

The marketing site is deliberately icon-driven (lucide-react SVG icons) rather than photo-heavy, so there's very little raster-image surface area. The one image found — the logo — is implemented correctly via `next/image` with descriptive alt text, explicit dimensions, and priority loading. No missing-alt risk found anywhere in the codebase.

**Finding**: (Low) the near-total absence of real photography (office, team) is technically clean but ties into the E-E-A-T/trust gap flagged under Content Quality and Local SEO — worth adding a small set of real photos as part of the Phase 3 trust-signal work, not a technical fix.

---

## Supplementary: Local SEO — Score: 42/100

*Not part of the 7 officially-weighted categories, but material given the real single office and geographically bounded service area.*

**What works**: address is 100% consistent across schema, footer, and `/contact` body text; GSTIN + LLPIN displayed sitewide and matching schema — a strong trust signal for a compliance-services firm.

| Severity | Finding | Recommendation |
|---|---|---|
| Critical | No phone number anywhere on the site — zero `tel:` links, zero visible phone number, nothing in schema | Add a real phone number to header/footer/contact + `contactPoint.telephone` |
| High | No Chennai/Tamil Nadu-specific landing content despite `areaServed: "Tamil Nadu"` in schema | Add local qualifiers to titles/H1s of top-converting service pages |
| Medium | No Maps embed or directions link on `/contact` | Embed Google Maps iframe + directions link |
| Medium | No testimonials or review schema | Same fix as Content Quality E-E-A-T |
| Info | GBP listing status, citation presence, and local-pack ranking are unverifiable from the site alone (no Maps/GBP API access in this environment) | Business owner should independently confirm/claim/optimize GBP |

## Supplementary: Search Experience (SXO) — Score: 48/100

SERP-backwards analysis against 4 representative queries found the biggest gap is missing government-fee transparency (Critical — see main findings), plus a single ~380-word template trying to serve both transactional and informational search intent with an identical generic 4-question FAQ regardless of query. Compliance-checklist content is also fragmented across 3 separate pages where competitors cover it in one.

## Supplementary: Visual / UX — Score: 80/100

Screenshots captured live (desktop + mobile) for homepage, a service detail page, and `/pricing` — saved to `screenshots/`. Homepage above-the-fold clarity is strong on both viewports; the pricing table degrades gracefully to mobile with no overflow; no layout bugs found. Main gaps: the `/pricing` hero has no CTA at all, and the mobile header hides the primary CTA/login behind a hamburger menu.

## Supplementary: Backlinks — data-insufficient

No score computed — `firstmancorp.com` is not yet present in Common Crawl (the only data source available in this environment; no Moz/Bing/DataForSEO keys configured), which is a coverage gap expected for a newly launched regional site, not a confirmed empty profile. See the action plan for realistic regional link-building opportunities.

---

## Full findings detail

Per-category detail (all findings, evidence, and ready-to-use recommendations/snippets) is in `findings/`:
`technical.md`, `content.md`, `schema.md`, `sitemap.md`, `performance.md`, `visual.md`, `geo.md`, `sxo.md`, `local.md`, `backlinks.md`, `cluster.md`.

Screenshots are in `screenshots/`.

See `ACTION-PLAN.md` for the prioritized, phased implementation plan.
