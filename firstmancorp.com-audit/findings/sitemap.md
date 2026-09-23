# Sitemap Audit — firstmancorp.com

URL: https://firstmancorp.com/sitemap.xml
Date: 2026-08-31

## Category Score: 78 / 100

Structurally sound, well-formed, correctly referenced sitemap with excellent
parity against the actual `/services` catalog. Docked mainly for two live
pages missing from the sitemap and a `lastmod` field that is generated at
build/render time rather than reflecting real content changes, which makes it
effectively useless as a crawl-priority signal.

---

## Findings

### 1. `lastmod` is a single generation timestamp shared by all 101 URLs, not a real content-change date
- **Severity:** Medium
- **Evidence:** Every `<url>` entry — from the homepage down to the newest
  resource article — carries the identical value `2026-08-31T11:28:17.454Z`
  (verified via raw fetch of `/sitemap.xml`, `grep -c "<lastmod>"` = 101,
  all identical). The timestamp is ~16 minutes before the audit's fetch time,
  strongly suggesting it's stamped by `new Date()` at build/ISR-regeneration
  time (the sitemap route is served with `Cache-Control: public, max-age=0,
  must-revalidate` and `X-Nextjs-Cache: HIT`), not derived from each page's
  actual last-modified content date.
- **Why it matters:** Google explicitly states it will start ignoring
  `lastmod` for a given site if the value doesn't reliably correlate with
  real page changes. A sitemap where every page — including ones that
  haven't changed in months — shows a "just now" timestamp on every deploy
  gives Googlebot zero useful signal for recrawl prioritization, and risks
  the whole field being discounted for this domain going forward.
- **Recommendation:** Drive `lastmod` per-page from the actual data layer
  (e.g. a `contentUpdatedAt` field per service/resource/compare page,
  updated only when the page's substantive content changes — not on every
  deploy/rebuild). If that plumbing isn't available yet, it's better to omit
  `lastmod` entirely than to emit a uniform, deploy-time value.

### 2. Two live, indexable pages are missing from the sitemap: `/legal/privacy` and `/legal/terms`
- **Severity:** Medium
- **Evidence:** Both URLs are linked from the homepage footer
  (`href="/legal/privacy"`, `href="/legal/terms"`), both return `200 OK`
  (verified via direct fetch), and neither path is disallowed in
  `robots.txt` (only `/api/`, `/dashboard`, `/enquiries`, etc. — the internal
  CRM app — are blocked). Neither appears anywhere in the 101-URL sitemap.
- **Why it matters:** These are legitimate, crawlable, indexable pages.
  Google will likely find them via the footer link regardless, but excluding
  them from the sitemap is inconsistent with the rest of the site's coverage
  and is a low-effort, low-risk gap to close — legal pages are also commonly
  linked from Search Console/trust signals and cost nothing to include.
- **Recommendation:** Add `/legal/privacy` and `/legal/terms` to the sitemap
  generator's URL source (likely just missing from whatever route
  enumeration builds the sitemap, since `/services`, `/compare`, and
  `/resources` are all fully enumerated correctly).

### 3. `priority` and `changefreq` are absent
- **Severity:** Info
- **Evidence:** `grep -c "priority\|changefreq"` on the raw sitemap = 0.
- **Why it matters:** Google has confirmed both tags are ignored entirely;
  Bing gives them minimal weight at best. Omitting them is correct, not a
  problem — noted here only for completeness per the audit checklist.
- **Recommendation:** No action needed. Do not add these tags back.

### 4. Single flat sitemap file — appropriate at current scale, but worth a forward note
- **Severity:** Info
- **Evidence:** 101 URLs total, well under the 50,000-URL / 50MB per-file
  limit (uncompressed size of the raw XML is a few KB). No `sitemap_index.xml`
  exists (confirmed 404 on `sitemap_index.xml`, `sitemap-index.xml`,
  `wp-sitemap.xml` via `sitemap_discovery.py`) — nor is one needed.
- **Why it matters:** At 101 URLs there is no crawl-efficiency benefit to
  segmenting into per-section sitemaps (services/resources/compare); a single
  flat file is simplest to maintain and Google has no trouble handling it.
- **Recommendation:** No action now. If the `/services/<slug>` catalog grows
  into the many hundreds (e.g. state-wise or city-wise service variants),
  revisit splitting into `sitemap-services.xml`, `sitemap-resources.xml`,
  etc. under a `sitemap_index.xml`, both to stay well clear of the URL cap
  and to let Search Console coverage reports be read per-section.

### 5. Content-Type and XML declaration are correct
- **Severity:** Info (positive)
- **Evidence:** `Content-Type: application/xml` header on `/sitemap.xml`;
  file begins with `<?xml version="1.0" encoding="UTF-8"?>` and a properly
  namespaced `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`.
  Well-formed, no unescaped entities observed in the 101 `<loc>` values.
- **Recommendation:** None — noted as a pass.

---

## What Works

- **XML is valid and well-formed**: correct declaration, correct namespace,
  101 well-formed `<url>` blocks, 101 unique `<loc>` values (no duplicates),
  each with a `<lastmod>`.
- **robots.txt correctly references the sitemap**: `Sitemap:
  https://firstmancorp.com/sitemap.xml` is present and the file it points to
  resolves with `200 OK` and validates as a proper `urlset`
  (confirmed via `sitemap_discovery.py`).
- **Exact parity between the `/services` hub and the sitemap**: the hub page
  links to exactly 81 `/services/<slug>` detail pages, and the sitemap
  contains exactly those same 81 URLs — zero orphans (pages linked but
  missing from the sitemap) and zero dead entries (sitemap URLs not
  actually linked from the hub). Same clean parity confirmed for `/compare`
  (3/3) and `/resources` (10/10).
- **No 404s or redirects found in spot-check**: sampled the homepage, both
  hub pages (`/services`), `/pricing`, two service detail pages
  (`pvt-ltd-registration`, `gst-registration`, `trademark-registration`),
  one `/compare/<slug>` page, and one `/resources/<slug>` article — all
  returned `200 OK` via `render_page.py`.
- **Internal CRM app correctly excluded**: `/login`, `/dashboard`,
  `/enquiries`, etc. are consistently absent from both `robots.txt` (as
  `Disallow`) and the sitemap — no leakage of authenticated-app routes into
  the public sitemap.
- **No deprecated/ignored tags**: `priority` and `changefreq` are correctly
  omitted rather than padded in with meaningless boilerplate values.
- **Sitemap well under size/URL limits**: 101 URLs, no need for a sitemap
  index at this scale.

---

## Missing Pages (in crawl but not in sitemap)

| URL | Status | Linked from |
|---|---|---|
| `https://firstmancorp.com/legal/privacy` | 200 OK | Homepage footer |
| `https://firstmancorp.com/legal/terms` | 200 OK | Homepage footer |

## Extra/Broken Pages (in sitemap but 404/redirected)

None found. All spot-checked sitemap URLs (8 sampled across homepage, hub
pages, service detail pages, a compare page, and a resource article)
returned `200 OK` with no redirects.

## Quality Gate Check (Location Pages)

Not applicable — this sitemap contains no location/city-swapped pages. All
81 service pages are distinct service types (registrations, filings,
licenses, ISO standards, etc.), not geo-duplicated templates, so the
30+/50+ location-page thresholds do not apply here.
