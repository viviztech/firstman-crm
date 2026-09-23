# Technical SEO Audit — firstmancorp.com

Audited: homepage, `/services` hub, 8 `/services/<slug>` detail pages (including
near-duplicate DSC and ISO variants), `/pricing`, `/about`, `/contact`,
`/compare` hub + `/compare/private-limited-vs-llp`, `/resources` hub +
`/resources/company-registration-in-india`. All fetched raw (no SPA shell —
`is_spa: false` on every page) via `render_page.py --mode auto`, cross-checked
with `curl -I` for redirect/header behavior. Sitemap re-validated with
`sitemap_discovery.py` (200, valid `urlset`, declared correctly in robots.txt —
confirms context.md, not stale). robots.txt disallow list (`/dashboard`,
`/login`, etc.) is the internal CRM and is correctly out of scope, per
context.md.

## Findings

### 1. No canonical tag on any page — site-wide (Critical)
Checked 15 distinct URLs across every template type (home, service hub,
service detail x8, pricing, about, contact, compare hub, compare detail,
resources hub, resource article): zero `<link rel="canonical">` tags anywhere
in `<head>`, and no `X-Robots-Tag`/canonical signal in HTTP headers either.
This is the single highest-risk gap given the site's structure: ~85
`/services/<slug>` pages are generated from a shared template with highly
similar body copy (see Finding 3), and there is no self-referencing canonical
telling Google which URL is authoritative if any duplicate/parameterized
variant is ever crawled (tracking params, trailing-slash before the 308
normalizes, staging/preview URLs, etc.). Google will pick its own canonical in
the absence of a declared one, which is unpredictable and can select the wrong
URL or fold near-duplicate service pages together, suppressing some from the
index.
**Recommendation:** Add a self-referencing absolute canonical
(`https://firstmancorp.com/services/<slug>`) to every page template in the
Next.js `generateMetadata()`/root layout. This is a single shared-layout fix
that covers all ~101 URLs at once.

### 2. Duplicated "| FirstMan | FirstMan" title suffix on ~99 of 101 pages (High)
Every non-home page checked has the site-name suffix appended twice, e.g.:
- `/services/pvt-ltd-registration` → `Private Limited Company – Fees, documents & process | FirstMan | FirstMan`
- `/services/dsc-class-iii-sign-encryption` → `DSC Class III - Sign & Encryption — Fees, documents & process | FirstMan | FirstMan` (86 characters)
- `/pricing` → `Transparent business service pricing – FirstMan | FirstMan`
- `/resources/company-registration-in-india` → `Company Registration in India: The Complete Guide – FirstMan Corporate Services | FirstMan`

This is a Next.js metadata-template bug: the per-page `title` already includes
`| FirstMan`, and the root-layout `title.template` appends ` | FirstMan` again.
Only the homepage (which doesn't use the per-page pattern) is unaffected. Titles
on the longer service names now run 80-90+ characters, well past Google's
~570px/~60-character SERP truncation point, and the visible duplication looks
broken in the SERP snippet — a direct CTR hit on every indexed page.
**Recommendation:** Fix the title composition in one place — either strip the
`| FirstMan` suffix from individual page `generateMetadata()` calls and let
the shared `title.template: '%s | FirstMan'` in the root layout own the
suffix, or drop the template and keep suffixes inline. Verify by spot-checking
5-6 templates after the fix (home, service, compare, resource, pricing).

### 3. Thin, heavily templated body content across ~85 service pages (High)
Pulled `extracted_text` for two DSC variants (`dsc-class-iii-dgft` vs.
`dsc-class-iii-individual`): both are exactly 503 characters and differ only
by the service name and price — the surrounding sentences ("...is handled as
an end-to-end engagement: we confirm applicability, prepare the required
records, coordinate submission, and stay with the matter through completion,"
"A completed `<service>` application prepared against current requirements,"
etc.) are identical boilerplate. Meta descriptions follow the same
find-and-replace pattern site-wide: `"Get <Service> handled end to end.
Starting ₹<price>, typical turnaround <N> business days. See documents,
process and deliverables."` This pattern repeats across all ~85
`/services/<slug>` pages (confirmed on 8 samples spanning DSC, ISO, GST,
Pvt Ltd). Combined with Finding 1 (no canonicals), this is a classic
programmatic-SEO thin/near-duplicate-content pattern that Google's helpful-
content and duplicate-content systems can algorithmically demote as a set,
even though the service/price/turnaround/FAQ facts are legitimately unique.
**Recommendation:** Not urgent to rewrite all 85 pages, but prioritize adding
1-2 genuinely differentiating paragraphs (service-specific caveats, common
mistakes, eligibility nuances, a short worked example) to the highest-intent
20-30 pages (Pvt Ltd, LLP, GST registration/filing, trademark, FSSAI, ISO
27001, ITR) rather than treating the template as done. The `FAQPage` JSON-LD
already present per-service (see below) is a good place to grow unique content
without a full template redesign.

### 4. No Open Graph / Twitter Card meta tags anywhere (Medium)
`og:title`, `og:description`, `og:image`, `twitter:card`, etc. are absent from
every page sampled, including the content-marketing `/resources/*` articles
that are the pages most likely to be shared on LinkedIn/WhatsApp/Twitter by
prospects or backlinked. Without OG tags, shared links fall back to an
unstyled/blank card, hurting click-through from social and messaging
referrals — WhatsApp in particular (a primary channel for this business per
the CRM spec) renders a rich preview card only when OG tags are present.
**Recommendation:** Add `og:title`, `og:description`, `og:image` (reuse the
existing `/brand/firstman-logo.png` or a dedicated 1200x630 social image),
`og:type`, `og:url`, and `twitter:card=summary_large_image` to the shared
metadata generator — same single-fix-covers-all-pages leverage as Finding 1.

### 5. No BreadcrumbList structured data (Medium)
Service detail pages carry `Service`, `FAQPage`, and `Organization` JSON-LD
(confirmed on `/services/pvt-ltd-registration`: 3 valid blocks) but no
`BreadcrumbList`, despite a real 2-3 level hierarchy (Services →
`<slug>`). Breadcrumb schema is low-effort here since the hierarchy already
exists in the URL structure and likely in on-page breadcrumb UI.
**Recommendation:** Add `BreadcrumbList` JSON-LD to service, compare, and
resource detail templates. (Full structured-data validation is `seo-schema`'s
territory — flagging presence/absence only.)

### 6. `/services` hub links to 81 of 85 service detail pages (Low)
Regex-extracted all `href="/services/<slug>"` links from the rendered
`/services` hub HTML: 81 unique targets, vs. 85 `/services/<slug>` URLs in the
sitemap. The remaining ~4 pages are only discoverable via the sitemap (or
direct link from a `/compare` or `/resources` page), not through primary
on-site navigation — a minor orphan-page pattern. Not a blocking crawlability
issue since the sitemap is valid and submitted, but internal links carry more
ranking signal than sitemap-only inclusion.
**Recommendation:** Audit which slugs are missing from the hub's listing/filter
logic and confirm it's not an unintentional filter (e.g., a category or tag
excluding a few services) rather than deliberate curation.

### 7. Two-hop redirect for the `http://www` variant (Low)
`http://www.firstmancorp.com/` → `https://www.firstmancorp.com/` (307) →
`https://firstmancorp.com/` (redirect, non-www canonical). All other
combinations tested (`http://firstmancorp.com/`, `https://www...`) resolve in
a single hop to the canonical `https://firstmancorp.com/`. Trailing-slash
normalization on deep URLs is a clean single 308
(`/services/pvt-ltd-registration/` → `/services/pvt-ltd-registration`). The
extra hop only affects the `http+www` combination, which is unlikely to be
crawled or linked in practice, so impact is minimal.
**Recommendation:** Collapse to a single redirect rule (`http://www` →
`https://` non-www directly) in the Traefik/edge config if easy; low priority.

### 8. `X-Powered-By: Next.js` header disclosed on every response (Low)
Confirmed on home, service, pricing, and even the 404 response. Minor
information disclosure (framework/version fingerprinting aid); does not affect
rankings.
**Recommendation:** Set `poweredByHeader: false` in `next.config`.

### 9. No `Permissions-Policy` header (Info)
The existing security header set (CSP, HSTS with `includeSubDomains`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`) is solid and applied
consistently across all page types including error pages — confirms and
expands context.md. Adding `Permissions-Policy` (e.g.
`camera=(), microphone=(), geolocation=()`) would round this out; not urgent
since nothing on the marketing site currently requests those APIs.

## What works

- robots.txt is correct and unambiguous: `Allow: /` with the CRM app paths
  disallowed intentionally, `Sitemap:` directive present and resolves.
- Sitemap validated via `sitemap_discovery.py`: 200, well-formed `urlset`,
  correctly declared in robots.txt — not stale, no fallback path needed.
- No redirect chains longer than 2 hops anywhere tested; canonical host
  (`https://firstmancorp.com`, non-www) is consistently the end state; 404s
  return a real `404` status (not a soft-404 200).
- `viewport` meta (`width=device-width, initial-scale=1`) present and
  unrestricted (no `user-scalable=no`) on every page sampled.
- Every page sampled has exactly one `<h1>`.
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy) are strong and applied uniformly, including on 404s.
- No page is JS-rendered/SPA — all content is present in raw server-rendered
  HTML (`is_spa: false` across every sample), so crawlers get full content
  without executing JavaScript.
- Structured data exists and is valid where present (`Organization` sitewide;
  `Service` + `FAQPage` on service detail pages) — a real foundation, just
  missing `BreadcrumbList` and OG/Twitter tags (Findings 4-5).
- Image `alt` attributes present and descriptive on sampled homepage images.

## Score: 64 / 100

Solid crawlability, security, redirect, and mobile-viewport fundamentals are
undercut by a sitewide missing-canonical gap and a title-template bug that
touch effectively every one of the 101 indexed URLs, plus a real thin/
near-duplicate-content risk baked into the ~85-page programmatic services
template — all three are high-leverage, single-template fixes rather than
page-by-page work.
