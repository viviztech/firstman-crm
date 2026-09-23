# SEO Action Plan — firstmancorp.com

Prioritized by severity and effort. Most Phase 1-2 items are single fixes in a shared Next.js layout/component that propagate across all 101 pages at once — high leverage, low effort.

## Phase 1: Critical Fixes (Week 1)

- [ ] **Fix the duplicated title-tag suffix bug** ("... | FirstMan | FirstMan" on ~99 pages) — single fix in the shared metadata layout/template.
- [ ] **Add self-referencing canonical tags** to the shared metadata generator — covers all 101 URLs in one change.
- [ ] **Add a real phone number** as a `tel:` link to the header/footer and `/contact`, plus `contactPoint.telephone` in the Organization schema.
- [ ] **Add government-fee amounts** to the price block and `Offer` schema on every service page (currently `null`) — the single highest-leverage content fix found in this audit.

## Phase 2: High-Impact Improvements (Weeks 2-3)

- [ ] **Upgrade Organization schema**: `@type` → `ProfessionalService`, `address` → structured `PostalAddress` object (one shared component, all pages).
- [ ] **Add `BreadcrumbList` schema** — one reusable component across `/services`, `/resources`, `/compare`.
- [ ] **Add Open Graph / Twitter Card tags** to the shared layout, reusing the existing brand logo.
- [ ] **Fix the worst internal-linking gaps**:
  - Link `/services/iso-certification` to all 8 of its certification variant pages.
  - Add reciprocal links from Annual Compliance service pages (`annual-compliance-pvt-ltd`, `annual-compliance-llp`, `dir-3-kyc`) back to `/resources/annual-compliance-guide`.
  - Cross-link the 3 `/compare/<slug>` pages to each other and to `/resources/how-to-choose-a-business-structure`.
- [ ] **Add a unique content block per service page** (150-200 words), generated from the existing `checklistTemplate`/`requiredDocuments` catalog fields — turns near-duplicate pages into genuinely differentiated ones without manual per-page writing.
- [ ] **Fix pricing/mobile CTA gaps**: add a CTA button to the `/pricing` hero; surface a persistent CTA on the mobile header instead of hiding it behind the hamburger menu.

## Phase 3: Content & Authority (Month 2)

- [ ] Add named, credentialed (CA/CS) bylines to resource articles and flagship service pages.
- [ ] Add client testimonials/case studies to the homepage and top-converting service pages; consider `Review`/`AggregateRating` schema once genuine reviews exist.
- [ ] Add Chennai/Tamil Nadu qualifiers to titles/H1s of top-converting service pages.
- [ ] Embed a Google Maps iframe + directions link on `/contact`.
- [ ] Consolidate the compliance-checklist content currently fragmented across 3 pages (checklist, calendar, penalties).
- [ ] Add `FAQPage` + complete `Article` schema (`image`, `publisher`) to the 10 `/resources/<slug>` guides.
- [ ] Add `/legal/privacy` and `/legal/terms` to the sitemap; fix the uniform `lastmod` timestamp to reflect real content-update dates.
- [ ] Reduce the shared CSS (114KB) and JS chunk (177KB) sizes.
- [ ] Add 2-3 query-specific FAQ entries per service (eligibility, minimum capital, individual-vs-company fee) beyond the current generic 4.

## Phase 4: Monitoring & Iteration (Ongoing)

- [ ] Connect Google Search Console + PageSpeed Insights/CrUX API credentials — replaces every lab-only performance estimate in this audit with real field data.
- [ ] Add a free Moz API key; recheck Common Crawl inclusion at its next quarterly refresh (~3 months).
- [ ] Pursue realistic regional link-building: Google Business Profile, JustDial/Sulekha/IndiaMART listings, Madras/Tamil Nadu Chamber of Commerce membership, guest articles on Indian business/finance outlets (Inc42, YourStory) on GST/MSME/trademark topics, referral links from partner CA/CS/legal firms.
- [ ] Capture an SEO drift baseline now (`drift_baseline.py`) so future changes can be compared against this audit.
- [ ] Re-audit after Phase 1-2 ships to confirm the canonical/title/schema fixes landed correctly and measure score improvement.
