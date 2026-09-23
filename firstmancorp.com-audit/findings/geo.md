# GEO / AI Search Readiness Audit — firstmancorp.com

**Category score: 68 / 100**

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Citability | 25% | 78 | 19.5 |
| Structural Readability | 20% | 75 | 15.0 |
| Multi-Modal Content | 15% | 45 | 6.75 |
| Authority & Brand Signals | 20% | 50 | 10.0 |
| Technical Accessibility | 20% | 90 | 18.0 |
| **Total** | | | **69.25 → 68** |

Sampled: homepage, `/resources/company-registration-in-india`, `/resources/documents-required-for-company-registration`,
`/resources/what-is-dir-3-kyc`, `/resources/annual-compliance-checklist-private-limited`,
`/compare/private-limited-vs-llp`, `/compare/proprietorship-vs-private-limited`,
`/services/gst-registration`, `/services/pvt-ltd-registration`. All fetched raw (no JS render needed —
`is_spa: false`, `mode_used: raw` on every URL), confirming server-rendered HTML with no JS wall for
crawlers. robots.txt and `/llms.txt` fetched directly via curl.

---

## AI Crawler Access

- **robots.txt** (verified directly, `https://firstmancorp.com/robots.txt`, HTTP 200): single blanket
  `User-Agent: *` block with `Allow: /` and disallows limited to the internal CRM app
  (`/api/`, `/dashboard`, `/enquiries`, `/clients`, `/orders`, `/catalog`, `/compliance`, `/invoices`,
  `/expenses`, `/reports`, `/settings`, `/login`). **No AI-crawler-specific rules at all** — GPTBot,
  OAI-SearchBot, ClaudeBot, PerplexityBot, CCBot, anthropic-ai are all implicitly allowed under the
  wildcard. This is the ideal posture for AI search visibility — no finding needed here, confirmed as a strength.
- Sitemap referenced correctly (`Sitemap: https://firstmancorp.com/sitemap.xml`).

## llms.txt

- **Present** at `https://firstmancorp.com/llms.txt` (HTTP 200, `Content-Type: text/plain`), well-formed
  markdown directory: title, one-line description, links to pricing/contact, then services grouped by
  category with price + turnaround (e.g. `- [Private Limited Company](.../pvt-ltd-registration): ₹10,999.00, ~7 business days`).
- **Finding (Low):** the portion of `/llms.txt` inspected lists `/services/*` pages only — the 10
  `/resources/*` guide articles and the `/compare/*` pages (the strongest citability candidates on the
  site) were not visible in the section reviewed. If they're absent from the full file, llms.txt is
  pointing AI agents at transactional pages rather than the informational content most likely to earn a
  citation for "how to register a company in India"-style queries.
  *Recommendation:* add a `## Guides` section linking all `/resources/<slug>` and `/compare/<slug>` URLs
  with one-line summaries. Effort: low (30 min). Per current AI-engine behavior this is optional/low-priority
  overall — most engines don't yet consume llms.txt reliably — so don't over-invest here.

## Citability Findings

### What works (strong)
- **Resource articles lead with a direct, self-contained answer sentence** covering the full "what/who/how"
  in the first ~40 words, before any structure/detail. E.g. DIR-3 KYC guide opens: *"DIR-3 KYC is an annual
  filing every individual holding a Director Identification Number (DIN) must complete, and missing the
  deadline gets your DIN deactivated until it's filed with a late fee."* — this is a near-perfect extractable
  AI Overview / ChatGPT answer passage on its own.
- Same pattern holds across all 4 resource articles sampled (company registration guide, documents required,
  annual compliance checklist, DIR-3 KYC) and both compare pages sampled.
- **Byline + published/updated dates are visible in rendered text and machine-detected** by htmldate on
  every resource article (e.g. `Published 5 June 2026`, `Published 2 June 2026 · Updated 15 July 2026`).
  Freshness signals are a known factor in AI citation preference.
- **`/compare/*` pages use literal comparison tables** (Private Limited vs LLP, Proprietorship vs Private
  Limited) — tabular format is highly favored for AI Overview comparison-intent answers — plus a
  **question-phrased FAQ block per page** ("Can an LLP be converted to a Private Limited Company later?",
  "Which is cheaper to maintain?") with single-paragraph direct answers. This is the single best-optimized
  content type on the site for AI citation.
- Section headings on resource pages are frequently phrased as direct statements/questions matching search
  intent (the DIR-3 KYC page's own H1 is a question: "What is DIR-3 KYC and Who Needs to File It?").
- `/services/*` pages carry a genuinely useful, specific FAQ block (cost, turnaround, scope) with hard
  numbers ("Professional fees start at ₹1,499.00", "typical turnaround is 5 business days") — citable for
  cost/turnaround queries, even though the surrounding copy is sales-oriented.

### Findings (gaps)

**1. No FAQPage / Article / HowTo structured data on any sampled page — Severity: High**
Evidence: context.md's structured-data scan of the homepage found exactly 1 JSON-LD block, type
`Organization` only. None of the 9 pages fetched in this pass showed evidence of additional schema (the
render tool's `structured_data` block was only captured for the homepage in this pass, which also showed
`block_count: 1`). Given the resource and compare pages contain genuine, well-formed Q&A content
(explicit "Frequently asked questions" sections with question-form headers and single-paragraph answers),
this is disqualifying evidence that FAQPage schema was never added — the richest, cheapest schema win for
AI/SERP answer extraction is being left on the table across all 10 resource guides and both/all compare
pages.
Recommendation: add `FAQPage` JSON-LD to every `/resources/<slug>` and `/compare/<slug>` page mirroring the
visible Q&A blocks, and `Article` schema (headline, datePublished, dateModified, author) on resource
articles reusing the visible byline/date. Effort: medium (one shared component, applied across ~15 pages).

**2. Generic team byline, no named/credentialed author — Severity: Medium**
Evidence: every resource article attributes to "By FirstMan Corporate Services Team" with no individual
name, title, or credential (e.g. Company Secretary, Chartered Accountant) shown or linked to an author bio.
For compliance/legal topics (DIR-3 KYC, annual filings, company law), AI systems and Google's own guidance
weight named-expert authorship (E-E-A-T) more heavily than an anonymous team credit.
Recommendation: add a named author line with title/credential (even rotating among 2-3 real staff) and a
short bio/`Person` schema entry per author. Effort: low-medium.

**3. Homepage carries almost no directly citable factual content — Severity: Medium**
Evidence: extracted homepage text is largely brand/marketing copy ("Build the business. We'll manage the
filings.", "One shop for every aspiring entrepreneur.") with only loose stat callouts ("81+ specialist
services", "Tamil Nadu service coverage") and no direct answer to "what does FirstMan do" in a citable
single-paragraph form.
Recommendation: not a priority fix — informational queries should be won by `/resources/*`, not the
homepage — but add one tight, factual "who we are" paragraph near the top (entity name, location, services
offered, area served) to strengthen entity grounding for AI systems doing homepage-based brand lookups.
Effort: low.

**4. `Organization` schema is thin and the wrong type — Severity: Medium** (carried over from context.md's
technical scan, relevant to GEO because AI systems use structured entity data for grounding)
Evidence: single JSON-LD block on homepage is `@type: Organization` (not `ProfessionalService` or
`LocalBusiness`, despite having a real single Chennai address), `address` is a bare string rather than a
`PostalAddress` object, and there is no `contactPoint` (phone/email).
Recommendation: switch to `ProfessionalService` (or `LocalBusiness` subtype), structure `address` as
`PostalAddress`, add `contactPoint` with phone. Effort: low.

**5. Off-site brand/entity signals not verifiable in this environment — Severity: Unrated/Unknown**
Evidence: no DataForSEO MCP, Google, Moz, or Bing credentials available in this environment (per
context.md); Wikipedia, Reddit, YouTube, and LinkedIn presence for "FirstMan Corporate Services" could not
be checked via live search in this pass. Given it's a single-location Chennai firm, a Wikipedia entity page
is unlikely to exist and YouTube/Reddit presence is unconfirmed either way.
Recommendation: manually confirm (or build) a Google Business Profile, a YouTube channel with short
explainer videos on the same topics as the `/resources/*` guides (YouTube mentions correlate ~0.737 with AI
citation — the strongest known signal), and monitor/participate in relevant India-startup Reddit threads
(r/IndianStartups, r/india) where organic mentions could seed citations. Effort: medium-high, longer
timeline.

**6. Robots.txt / llms.txt AI-crawler status — Verified, no action needed**
Both were fetched directly in this pass (not just inferred from context.md): robots.txt returns HTTP 200
with the expected blanket allow + internal-app-only disallow; `/llms.txt` returns HTTP 200 with well-formed
content. No blocking finding here — listed for completeness since the task asked for explicit confirmation.

---

## What Works (summary)

- No AI crawler blocking anywhere — GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot all implicitly allowed.
- llms.txt present and well-formed (if incomplete re: resources/compare pages).
- Server-rendered HTML on every page sampled — zero JS-rendering risk for AI crawlers that don't execute JS.
- Resource articles consistently open with a single, self-contained, directly-extractable answer sentence.
- Compare pages combine tables + question-form FAQs — the best-optimized content type on the site.
- Visible + machine-detectable publication/update dates on all resource articles.
- Service pages carry specific, citable cost/turnaround facts inside genuine FAQ blocks.

## Platform-Specific Read (qualitative, no live rank data available)

- **Google AI Overviews:** likely best fit — favors the tabular `/compare/*` pages and direct-answer
  resource openers; missing FAQPage schema is the main ceiling.
- **ChatGPT / OAI-SearchBot:** good raw-text extractability (SSR, clean passages); weak on off-site
  corroboration (Reddit/YouTube/Wikipedia) which ChatGPT search weights meaningfully.
  Only ~11% of domains get cited by both ChatGPT and Google AIO — this site's technical/content
  foundation is above-median but the off-site signal gap is the likely blocker to double-citation.
- **Perplexity:** benefits from clear dates/byline and tables; would benefit most from FAQPage/Article
  schema since Perplexity leans on structured citation extraction.
- **Bing Copilot:** similar profile to Google (shares some of the same underlying index signals);
  Organization schema quality (finding 4) matters more here for local/entity grounding.

---

## Top 5 Highest-Impact Changes (effort estimates)

1. Add `FAQPage` schema to all `/resources/*` and `/compare/*` pages from existing visible Q&A content — **High impact, Medium effort**
2. Add `Article` schema (author, datePublished, dateModified) to `/resources/*` guides — **High impact, Low effort**
3. Upgrade `Organization` → `ProfessionalService`/`LocalBusiness` with structured `PostalAddress` + `contactPoint` — **Medium impact, Low effort**
4. Add named author/credential lines to resource articles (replace generic "Team" byline) — **Medium impact, Low-Medium effort**
5. Expand `/llms.txt` to include `/resources/*` and `/compare/*` guides — **Low impact, Low effort** (llms.txt itself is currently low-value across AI engines; don't over-prioritize)
