# Shared audit context — firstmancorp.com

- **Site**: https://firstmancorp.com — FirstMan Corporate Services LLP, an Indian
  corporate services firm (company registration, GST, compliance, trademarks,
  ISO/FSSAI licensing, IP). This is the PUBLIC marketing site only (Next.js 15
  App Router, server-rendered/static, not a SPA). It sits alongside an
  authenticated internal CRM and a customer portal on the same domain — those
  are correctly disallowed from crawling (see robots.txt below) and are OUT OF
  SCOPE for this SEO audit.
- **Business type**: B2B/B2C professional services, single physical location
  (Chennai, Tamil Nadu, India), serves clients across Tamil Nadu — hybrid of
  "professional service" and "local service" (has a real street address, but
  much of the business likely happens remotely/online too).
- **Tech stack**: Next.js 15, React 19, Tailwind CSS 4, Drizzle/Postgres backend
  (not relevant to SEO). Deployed on a self-hosted Coolify instance (Traefik
  reverse proxy), HTTPS via Let's Encrypt.
- **Sitemap**: https://firstmancorp.com/sitemap.xml — 101 URLs total, already
  extracted to `firstmancorp.com-audit/sitemap-urls.txt` (one URL per line) so
  you don't need to re-fetch/re-parse it. Breakdown: 1 homepage, `/services`
  (hub) + ~85 individual `/services/<slug>` detail pages, `/pricing`, `/about`,
  `/contact`, `/compare` (hub) + 3 `/compare/<slug>` pages, `/resources` (hub)
  + 10 `/resources/<slug>` articles.
- **robots.txt** (https://firstmancorp.com/robots.txt):
  ```
  User-Agent: *
  Allow: /
  Disallow: /api/
  Disallow: /dashboard
  Disallow: /enquiries
  Disallow: /clients
  Disallow: /orders
  Disallow: /catalog
  Disallow: /compliance
  Disallow: /invoices
  Disallow: /expenses
  Disallow: /reports
  Disallow: /settings
  Disallow: /login
  Sitemap: https://firstmancorp.com/sitemap.xml
  ```
  All disallowed paths are the internal CRM app — correct and intentional, not
  a finding.
- **Structured data found on homepage** (1 JSON-LD block, `Organization` type):
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "FirstMan Corporate Services",
    "legalName": "FirstMan Corporate Services LLP",
    "url": "https://firstmancorp.com/",
    "areaServed": "Tamil Nadu",
    "logo": "https://firstmancorp.com/brand/firstman-logo.png",
    "address": "W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West, Chennai - 600 101",
    "taxID": "33AAFFF0744H1ZS",
    "identifier": { "@type": "PropertyValue", "name": "LLPIN", "value": "AAI-5319" }
  }
  ```
  Note: `address` is a bare string, not a proper `PostalAddress` object; no
  `contactPoint` (phone/email) present in this render; type is generic
  `Organization` rather than `LocalBusiness`/`ProfessionalService`.
- **Security headers observed** (via response headers on `/`): CSP present
  (`default-src 'self'; script-src 'self' 'unsafe-inline'; ...`), HSTS
  (`max-age=63072000; includeSubDomains`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  `script-src 'self' 'unsafe-inline'` — note the `'unsafe-inline'` (needed for
  Next.js inline hydration scripts and the GA/GTM inline init scripts recently
  added).
- **Analytics**: Google Analytics (gtag.js, G-7KCYVDSDT2) and Google Tag
  Manager (GTM-MB2ZFMPQ) were both just installed, env-gated, marketing-pages-only.
- **No baseline exists yet** for `seo-drift` (first audit for this domain).
- **No Google API credentials, no DataForSEO MCP, no Moz/Bing keys** configured
  in this environment — Common Crawl (basic tier) is the only backlink data
  source available; rely on lab-only Lighthouse/CWV data, not CrUX field data.
- **Output directory**: write your findings file to
  `d:\projects\firstman-crm\firstmancorp.com-audit\findings\<your-category>.md`
  (create the `findings/` dir if needed — it already exists). Use absolute
  Windows paths.
- **Rendering tool**: `"$HOME/.claude/skills/seo/bin/claude-seo" run render_page.py <url> --mode auto --json` renders a page (raw HTML, extracted text, structured data, headers, SPA detection). Use `--mode auto` unless you have a specific reason to force raw/rendered.
