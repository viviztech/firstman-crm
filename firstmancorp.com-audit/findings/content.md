# Content Quality Audit — firstmancorp.com

**Category:** Content Quality (E-E-A-T, thin/duplicate content, readability, AI citation readiness)
**Date:** 2026-08-31
**Pages sampled:** homepage, `/services` hub, `/pricing`, `/about`, `/contact`, `/compare` hub, `/resources` hub, 7 `/services/<slug>` detail pages (pvt-ltd-registration, gst-registration, trademark-registration, dsc-class-iii-individual, iso-27001-2013-certification, fssai-registration, iec-registration), 3 `/resources/<slug>` articles (company-registration-in-india, what-is-dir-3-kyc, annual-compliance-guide), all 3 `/compare/<slug>` pages. 20 URLs total out of 101 in the sitemap.

## Methodology caveat (important)

Every single fetch made with `render_page.py --mode auto --json` in this session returned an `extracted_text` field **truncated to exactly 503 characters**, regardless of page type (homepage, service page, 1,500+ word resource article, or 3-row comparison table all returned the same 503-char cap, mid-word/mid-sentence). This is a fetch/render artifact in this session, not a property of the pages themselves — reliable full-page word counts could not be obtained for any URL. Findings below that depend on word count are therefore **directional, based on template-pattern evidence and cross-page comparison of the available text**, not verified word counts. Recommend re-running this audit with `--output` (full raw/rendered HTML) or a fixed extraction path before treating any word-count-derived score as final.

## Findings

### 1. Service-page boilerplate is reused near-verbatim across dissimilar services (High)
**Evidence:** Comparing the openings of `/services/dsc-class-iii-individual` and `/services/iso-27001-2013-certification` — two completely different service types (a digital signature certificate vs. an information-security management certification):
> "DSC Class III - Individual is handled as an end-to-end engagement: we confirm applicability, prepare the required records, coordinate submission, and stay with the matter through completion."
> "ISO 27001:2013 Certification is handled as an end-to-end engagement: we confirm applicability, prepare the required records, coordinate submission, and stay with the matter through completion."

Only the service name changes. Similarly, `/services/fssai-registration`, `/services/iec-registration`, and `/services/trademark-registration` (food licensing, import/export code, and IP registration — three unrelated domains) share an identical "What you receive" bullet block verbatim: "A complete license or registration application / Department-ready supporting documents / Follow-up through approval or formal response," and an identical "How it works / A controlled four-step..." section opener.
**Recommendation:** This is the single biggest content-quality risk on the site given ~85 of 101 sitemap URLs are this template. Add a mandatory unique-content slot per service (min. 150-200 words) covering what's actually different about that filing/license: eligibility nuances, common rejection reasons, department-specific quirks, typical processing-time variance, renewal cadence. Populate from the `checklistTemplate`/`requiredDocuments` jsonb already in the CRM's service catalog schema (Section 4.3) so differentiation is data-driven, not manually written 85 times.

### 2. No E-E-A-T experience/authority signals surfaced on any sampled page (High)
**Evidence:** Across all 10 service-page/homepage/hub samples, no named author, credential (CA/CS/advocate), case study, client testimonial, review count, or first-hand-experience language ("we filed X for a client in..." ) appeared. Resource articles do carry a byline, but it is a generic team attribution ("By FirstMan Corporate Services Team"), not a named professional with stated credentials. `context.md`'s structured-data capture confirms the homepage `Organization` JSON-LD has no `contactPoint` and uses the generic `Organization` type rather than `ProfessionalService`/`LocalBusiness`, despite this being a single-location Chennai firm with a real street address.
**Recommendation:** Add named practitioner bylines with credentials (e.g., "Reviewed by [Name], Company Secretary, ACS ####") to resource articles and ideally to service pages; add a testimonials/case-study module (even 1-2 real client outcomes) to flagship service pages like pvt-ltd-registration and gst-registration; add `contactPoint` and switch to `ProfessionalService` schema type.

### 3. Freshness signals are real on resources, but appear structurally absent on service pages (Medium)
**Evidence:** Resource articles carry genuine, differentiated publish/update dates in their body copy ("Published 2 June 2026 — Updated 15 July 2026", "Published 7 July 2026", "Published 1 July 2026 — Updated 20 July 2026") — a good freshness signal. By contrast, `htmldate`'s best-guess `publication_date` for the homepage and every sampled service page was identically `2026-01-01` — almost certainly a deploy/launch date artifact rather than a real content date, and there is no visible "last reviewed" date in the truncated service-page text sampled. For pages about statutory filings (GST rates, MCA fee schedules, ISO standard revisions) that change periodically, an absent freshness signal undermines trust for both users and AI answer engines.
**Recommendation:** Surface a genuine "Last reviewed: [date]" on every service page, tied to an actual content-review workflow, not just deploy time.

### 4. Compare pages show genuine comparative synthesis — not thin templated tables (Low / Positive with one gap)
**Evidence:** All three `/compare/<slug>` pages open with a real synthesized recommendation sentence before the table, e.g. "A Private Limited Company suits businesses planning to raise equity funding or issue ESOPs, while an LLP suits businesses that want limited liability with a lighter, cheaper compliance load and no plans to raise venture capital." This is genuine editorial judgment, not just a mechanically generated feature-diff table — this is the right pattern per `seo-competitor-pages` guidance. Gap: only 3 compare pages exist against ~85 services with many plausible high-intent comparison queries unaddressed (e.g., "GST registration vs GST composition scheme," "FSSAI basic vs state license," "trademark objection vs trademark opposition").
**Recommendation:** Keep the synthesis-first pattern; expand compare-page coverage using it as the template, prioritized by the most commonly confused service pairs in the catalog.

### 5. FAQ/Service/Offer schema is present and well-formed on service pages (Low / Positive)
**Evidence:** Every sampled `/services/<slug>` page carries `Service`, `Offer`, and `FAQPage`/`Question`/`Answer` JSON-LD blocks in addition to the sitewide `Organization` block — a genuinely AI-citation-friendly structure (clear entity + price/offer + extractable Q&A pairs). Resource articles carry `Article` schema. This is a real strength and should not be disturbed while addressing Finding #1.

## What works

- Sitewide `Organization` JSON-LD exposes a verifiable GSTIN/LLPIN — a concrete, checkable trust signal rare on competitor sites.
- Every service page ships `Service` + `Offer` + `FAQPage` structured data — strong foundation for AI/LLM citation and rich results.
- Resource articles carry real byline + published/updated dates in visible body copy, not just meta tags.
- `/compare/<slug>` pages lead with a genuine synthesized recommendation rather than a bare feature table — the comparative-value bar `seo-competitor-pages` looks for is met on the 3 pages that exist.
- Dedicated `/resources` hub and `/compare` hub give the templated service catalog some genuinely differentiated, editorially written surrounding content.
- Clear, consistent page structure (H1 → outcome bullets → process → FAQ) that is scannable and plausibly extractable by both users and AI answer engines, once uniqueness is added per page.

## Score: 46 / 100

**Justification:** The site has the right *shape* for content quality — structured data, an FAQ pattern, genuine editorial compare pages, and dated resource articles — but the dominant page type by URL count (~85 of 101 sitemap URLs, the `/services/<slug>` pages) shows clear, verifiable boilerplate reuse across unrelated services with no author/credential, testimonial, or case-study signal anywhere sampled, and no verified freshness signal on that page type. Because these ~85 pages are the site's primary organic-intent surface (e.g., "GST registration India," "trademark objection"), duplicate-structure and thin-differentiation risk there caps the score in the 40s even though the resources/compare content and structured-data foundation are genuinely above average. Score should be re-verified once full (non-truncated) page text can be pulled, as true word counts may be materially better or worse than the template-pattern evidence alone suggests.
