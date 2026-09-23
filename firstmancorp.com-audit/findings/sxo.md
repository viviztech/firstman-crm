# Search Experience Optimization (SXO) Audit — firstmancorp.com

**Method:** SERP-backwards analysis. 4 representative target queries sampled across
the transactional→informational spectrum; SERP dominant page-type/intent reasoned
from live web search results, then compared against the site's corresponding page
(fetched via `render_page.py --mode auto` + `parse_html.py`).

**SXO Gap Score: 48 / 100** (separate from, and not to be confused with, the SEO
Health Score reported elsewhere in this audit)

---

## Query-by-query verdicts

| # | Query | Intent | SERP dominant page type | Target page | Verdict |
|---|---|---|---|---|---|
| 1 | "private limited company registration India online" | Transactional-with-research | **Hybrid** (Service+Content) — RegisterKaro, LegalRaasta, IndiaFilings, StartupWala: single long-form page mixing eligibility/process/documents/FAQ with a buy CTA. LegalRaasta's title tag itself leads with `Starting ₹1,499 + Govt Fee` | `/services/pvt-ltd-registration` — Hybrid shell (4-stage process, "Included in engagement", FAQ, CTA) but only 393 words | **MEDIUM mismatch** — right shape, wrong depth |
| 2 | "GST registration online India process" | Informational-leaning | **Blog/how-to** — ClearTax, Tally, Bajaj Finserv, gov portal: step-by-step numbered process, eligibility threshold (₹20L/₹10L), Aadhaar authentication nuance, document list | `/services/gst-registration` — same generic service template, 376 words, no step-by-step, no turnover threshold | **HIGH mismatch** — query wants a procedural explainer, page is a thin order form |
| 3 | "trademark registration India cost" | Informational (cost/table) | **Blog/cost-breakdown** — Mondaq, Cashfree, Intepat, RegisterKaro *blog post* (not landing page), Bajaj Finserv: explicit govt-fee table (₹4,500 individual/MSME vs ₹9,000 company, per class, e-filing vs physical) | `/services/trademark-registration` — flat `₹7,999`, **`govtFeePaise: null`** — no government fee shown at all, no per-class or individual-vs-company breakdown | **CRITICAL mismatch** — the exact fact this query is asked to find is absent |
| 4 | "annual compliance checklist private limited company India" | Informational (reference/checklist) | **Blog Post** — Mondaq, Treelife, Stratrich, Corrida Legal: single comprehensive article (board meetings, AGM, AOC-4/MGT-7 due dates, penalties, often 1,500+ words, sometimes downloadable) | `/resources/annual-compliance-checklist-private-limited` — Article schema, dateModified present, but only 301 words / ~7 list items; due dates and penalties are split off into 3 *separate* resource pages | **MEDIUM-HIGH mismatch** — right format, content fragmented across 4 URLs instead of consolidated |

**Pattern:** every service page (85 of them, one template) runs the same 4-question
FAQ (`What is included?` / `What does it cost?` / `How long?` / `How will I track
progress?`) and ~380-word body regardless of whether the query behind it is
transactional or informational. The resource/compare pages exist as the
informational counterpart but are themselves thin and over-fragmented.

---

## Findings

### 1. Government-fee transparency is missing site-wide (CRITICAL)
**Evidence:** `govtFeePaise` is `null` in the embedded Service/Offer JSON-LD on
`/services/pvt-ltd-registration`, `/services/gst-registration`, and
`/services/trademark-registration` (confirmed via HTML grep on all three). Only
the professional fee (`₹10,999`, `₹1,499`, `₹7,999`) is shown. For trademark
registration specifically, government fee is not a flat add-on — it's ₹4,500
(individual/MSME/startup) vs ₹9,000 (company/LLP) per class, e-filing vs
physical — a fact every ranking competitor states explicitly, several in the
title tag itself.
**Recommendation:** Add a `govtFeePaise` line (or "varies by applicant type,
see below" + a small breakdown table) to every service page's price block and
Offer schema. This is the single highest-leverage fix — it is simultaneously a
schema-completeness issue, a trust signal, and the literal answer the
"...cost" query cluster is searching for.

### 2. One template serves both transactional and informational queries with no depth differentiation (HIGH)
**Evidence:** `/services/pvt-ltd-registration` (393 words), `/services/gst-registration`
(376 words), `/services/trademark-registration` word count in the same range —
all share the identical section skeleton (hero → 4-stage process → included/
best-suited-for/documents → FAQ → CTA) and the identical 4-question FAQ set.
Ranking competitors for the informational-leaning queries (#2, #3) run
1,500-3,000+ words covering eligibility thresholds, step-by-step portal
walkthroughs, and document specifics.
**Recommendation:** Do not try to make every service page win every intent.
For GST registration and other informational-leaning queries, either (a) extend
the service page with a real "How it works on the GST portal" step section and
an eligibility-threshold callout, or (b) pair it with a dedicated
`/resources/gst-registration-process` article (the site already has this
pattern via `/resources/company-registration-in-india`) and cross-link
prominently — the pattern exists, it's just missing for GST and trademark.

### 3. Resource "checklist"/"guide" articles are thinner than their query intent and over-fragmented (MEDIUM-HIGH)
**Evidence:** `/resources/annual-compliance-checklist-private-limited` — 301
words, Article schema present with `datePublished`/`dateModified: 2026-07-03`
(good freshness signal), but the actual checklist is ~7 bare `<li>` items with
no due-date table and no penalty figures on-page; those live instead on
`/resources/annual-compliance-calendar` and `/resources/penalties-for-missing-compliance-deadlines`.
A searcher landing here for "checklist" gets a stub and must find + click
through to 2 more URLs to get what one competitor article delivers in a single
scroll.
**Recommendation:** Consolidate due dates and penalty figures directly into
the checklist article (a compact table: item / due date / form / penalty),
keep the calendar and penalties pages as deeper drill-downs linked from it —
not as the only place the data lives.

### 4. No trust/social-proof signals on service pages (MEDIUM)
**Evidence:** Grep for testimonial/review/case-study/years-of-experience
language on `/services/pvt-ltd-registration` returns only the literal word
"review" (unrelated UI string) — no testimonials, no client count, no "X years
in business," no case studies anywhere in the rendered HTML. The only
credibility signals on the whole site (LLPIN `AAI-5319`, GSTIN
`33AAFFF0744H1ZS`) live in the homepage `Organization` JSON-LD, not
surfaced as visible page copy on the transactional pages where a
first-time buyer is deciding whether to trust a small Chennai firm over a
national platform like IndiaFilings.
**Recommendation:** Surface LLPIN/GSTIN, years operating, and a client/filing
count ("2,400+ companies incorporated" style, if true) as visible trust copy
near the price block on service pages — not just buried in schema.

### 5. FAQ schema is present but answers the wrong questions for the query cluster (MEDIUM)
**Evidence:** All three sampled service pages use the identical FAQPage schema
with `What is included?`, `What does it cost?`, `How long will it take?`,
`How will I track progress?` — none of which are the PAA-style questions users
actually search (`minimum capital for private limited company`, `documents
required for GST registration`, `individual vs company trademark fee`,
`can I register GST without a shop`). This is a missed featured-snippet /
PAA-capture opportunity, not just a content gap.
**Recommendation:** Add 2-3 query-specific FAQ entries per service (sourced
from that service's actual PAA cluster) on top of the 4 generic operational
questions already there.

---

## User stories (cited to signals above)

**Query 1 — "private limited company registration India online"**
- *As a first-time founder,* I want to know if I'm even eligible (min directors,
capital, residency) before I commit, *because* I've never done this, *but I'm
blocked by* the page never stating director/capital requirements — only a
"Scope and eligibility" step label with no content shown. *(Signal: SERP
competitors all list eligibility explicitly; target page has the heading but
not the substance.)*
- *As a price-sensitive founder,* I want to see the total out-of-pocket cost
including government fees before I call anyone, *because* professional fee ≠
total cost, *but I'm blocked by* `govtFeePaise: null`. *(Signal: LegalRaasta
title tag "Starting ₹1,499 + Govt Fee.")*

**Query 3 — "trademark registration India cost"**
- *As a solo founder/MSME,* I want to know I qualify for the ₹4,500 concession
rate vs the ₹9,000 company rate, *because* it's nearly half the government fee,
*but I'm blocked by* no fee breakdown of any kind on the page. *(Signal:
Intepat/RegisterKaro articles lead with exactly this ₹4,500-vs-₹9,000 split.)*

**Query 4 — "annual compliance checklist private limited company India"**
- *As a first-year Pvt Ltd director,* I want one page telling me every filing,
its due date, and the penalty for missing it, *because* penalties are per-day
and compound, *but I'm blocked by* the checklist article omitting due dates
and penalties, forcing 2 extra page visits. *(Signal: competitor articles —
Mondaq, Treelife — consolidate this in one scroll; target page's own "For
exact due dates" section admits the gap by linking out.)*

---

## What works

- Schema discipline is genuinely good: `Service` + `Offer` + `FAQPage` on every
service page, `Article` with `datePublished`/`dateModified` on resource pages —
most competitor sites in this niche don't bother with structured FAQ/Offer data
at this consistency.
- CTA placement is consistent and low-friction ("Talk to an expert," "Request a
callback," sticky discuss-this-service panel) — appropriate for
decision-stage traffic once it arrives.
- The 4-stage process framing (Scope & eligibility → Documents & preparation →
Approval to file → Submission & follow-up) is a clean, scannable structure —
it just needs the eligibility/documents sub-content filled in, not rebuilt.
- Site architecture already has the right *shape* for a hybrid strategy — 85
service pages, 3 comparison pages (`/compare/private-limited-vs-llp` etc.), 10
resource articles — the informational counterpart exists, it just isn't deep
or cross-linked enough yet.
- Freshness metadata (`dateModified`) is correctly implemented on resource
articles, which few small-firm competitor sites do.

---

## Persona scores (target pages, weakest first)

| Persona | Journey stage | Relevance | Clarity | Trust | Action | Total | Rating |
|---|---|---|---|---|---|---|---|
| Cost-sensitive solo founder (trademark/GST) | Decision | 12/25 | 15/25 | 8/25 | 18/25 | 53/100 | Needs Work |
| First-time founder, eligibility-unsure | Awareness | 14/25 | 12/25 | 10/25 | 18/25 | 54/100 | Needs Work |
| Compliance-deadline researcher | Consideration | 13/25 | 14/25 | 14/25 | 16/25 | 57/100 | Needs Work |
| Ready-to-buy repeat client | Decision | 22/25 | 20/25 | 15/25 | 22/25 | 79/100 | Good |

**Weakest: Cost-sensitive solo founder (53/100).** Top issue: no government-fee
breakdown anywhere in the price block or schema. Fix: Finding #1.

---

## Category score rationale (0-100)

- Page-type alignment: 6/15 — right hybrid shape, but no differentiation by
  query-intent depth
- Content depth: 4/15 — 300-400 words vs 1,500-3,000 on ranking competitors
- UX/trust signals: 6/15 — clean CTA/process framing, but zero visible
  testimonials/credentials, and price is incomplete
- Schema: 12/15 — Service/Offer/FAQPage/Article consistently implemented,
  docked only for the null govt-fee field and generic (non-persona-specific)
  FAQ content
- Media: 6/15 — no evidence of process diagrams, screenshots, or explainer
  video on sampled pages
- Authority: 6/15 — LLPIN/GSTIN exist but only in schema, not visible page copy
- Freshness: 8/10 — `dateModified` correctly present on resource content

**Total: 48/100**

---

## Limitations

- No DataForSEO/Google Search Console/Moz access — SERP composition (PAA text,
  featured-snippet format, ad density, AI Overview citation) was reasoned from
  WebSearch result titles/snippets, not a literal rendered Google SERP
  screenshot; treat page-type classifications as directionally reliable, not
  pixel-verified.
- Only 4 of ~101 site URLs were rendered in full; findings are extrapolated
  across the 85-page service template family based on the shared template and
  spot-checked FAQ/price patterns on 3 of them — not every service page was
  individually verified for word count.
- No CrUX/field engagement data (bounce rate, scroll depth) available to
  confirm the persona "would bounce" claims — these are structural inferences
  from content absence, not measured behavior.
- Media (video/diagram) presence was inferred from HTML/schema absence, not a
  visual render pass of every page.

---

Generate a PDF report? Use `/seo google report`
