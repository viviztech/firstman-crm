# Local SEO Audit — firstmancorp.com (FirstMan Corporate Services LLP)

**Business type detected:** Hybrid (real physical office in Chennai + serves clients across Tamil Nadu, much of the work happens remotely). Not a walk-in retail storefront — local-pack/proximity signals matter less here than for a brick-and-mortar business, but NAP integrity, GBP presence, and trust signals still matter for "near me" and city-qualified searches (e.g. "company registration Chennai").

**Industry vertical:** Professional/compliance services (company registration, GST, compliance, trademarks, ISO/FSSAI licensing) — closest schema.org fit is `ProfessionalService` or a narrower subtype (`AccountingService`, `LegalService` is a stretch since this isn't a law firm) rather than generic `Organization` or retail `LocalBusiness`.

**Pages checked (rendered via render_page.py, mode=auto):** `/` (home), `/about`, `/contact`, plus footer verified sitewide via the same fetches. Several `/services/*` page titles were sampled for local-intent signals.

---

## Local SEO Score: 42 / 100

| Dimension | Weight | Assessment |
|---|---|---|
| GBP Signals | 25% | Weak on-site reinforcement (no Maps embed, no "Get Directions"/Maps link, no review widget). GBP listing itself unverifiable — see Limitations. |
| Reviews & Reputation | 20% | No testimonials, ratings, or review schema anywhere on the site. GBP review count/rating unverifiable. |
| Local On-Page SEO | 20% | Address + "Service area: Tamil Nadu" present sitewide (footer) and consistent with `/contact`; but zero city-specific landing content and **no phone number anywhere on the site**. |
| NAP Consistency & Citations | 15% | Address is 100% consistent everywhere it appears. Phone is entirely absent — not inconsistent, just missing, which undermines the "P" in NAP. Tier-1 citation presence unverifiable (no search API access). |
| Local Schema Markup | 10% | Generic `Organization`, bare-string address (not `PostalAddress`), no `contactPoint`/`telephone`, no `geo`, no `openingHoursSpecification`. |
| Local Link & Authority | 10% | Not assessed in this pass (no backlink data source available beyond Common Crawl basic tier per context.md; out of scope for this sub-agent). |

---

## Findings

### 1. No phone number displayed anywhere on the site — Critical
**Evidence:** Grepped the full rendered HTML of `/`, `/about`, and `/contact` for `tel:` links and Indian phone-number patterns (`+91…`, 10-digit sequences). Zero matches on all three pages. The only occurrences of the string "phone" are the enquiry-form field label (`for="enquiry-phone"`, `name="phone"`) that captures the *visitor's* phone number — not the business's own number. "Talk to an expert" CTAs (checked all instances in the home page HTML) link to `/contact`, none are `tel:` links or show a number.
**Impact:** No click-to-call CTA (a meaningful mobile conversion/trust signal for local + service-area businesses), and the JSON-LD confirms there's no `telephone`/`contactPoint` to match against a GBP listing or citations — this is the single biggest NAP gap on the site.
**Recommendation:** Add a business phone number (or dedicated intake line) in the header/footer as a `tel:` link, on `/contact`, and add it to the JSON-LD as `telephone` and inside a `contactPoint` object. It must exactly match the number on the Google Business Profile listing.

### 2. Structured data uses generic `Organization`, not a local/professional-service subtype — High
**Evidence** (confirmed identical on all three pages fetched):
```json
{"@type":"Organization","name":"FirstMan Corporate Services","legalName":"FirstMan Corporate Services LLP", ... "address":"W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West, Chennai - 600 101", ...}
```
`address` is a bare string, not a `PostalAddress` object (no `streetAddress`/`addressLocality`/`addressRegion`/`postalCode`/`addressCountry` fields). No `geo`, no `openingHoursSpecification`, no `contactPoint`.
**Impact:** Generic `Organization` forfeits eligibility for local business rich results and weakens entity disambiguation for Google's local algorithm, which leans heavily on structured, typed address/contact data. `taxID`/`identifier` (LLPIN) are good additions but sit inside the wrong type.
**Recommendation:** Switch to `ProfessionalService` (or `AccountingService`, which schema.org treats as valid for tax/compliance-adjacent firms) with `LocalBusiness` in the `@type` array if multi-typing is supported by the templating approach. Convert `address` to a full `PostalAddress` object, add `telephone`, `contactPoint` (customer service, `areaServed: "Tamil Nadu"`, `availableLanguage`), `geo` (lat/long to 5-decimal precision), and `openingHoursSpecification`.

### 3. No location-specific ("Chennai") landing content — High
**Evidence:** Sampled titles across `/services` hub and detail pages (Private Limited Company, GST Registration, Annual Compliances, DSC Class III, etc.) plus `/compare` and `/resources` pages — all follow the pattern `"<Service> — Fees, documents & process | FirstMan"`. None reference "Chennai" in `<title>`, and grep for "Chennai" across every page returns a flat baseline of exactly 4 occurrences per page — all traced to the sitewide footer address block and the JSON-LD `address` string, not unique page copy.
**Impact:** `areaServed: "Tamil Nadu"` and the Chennai office exist only in schema/footer boilerplate, never surfaced in H1s, titles, or meta descriptions of the ~85 individual service pages. This is a missed opportunity: dedicated, geographically-qualified service pages are called out as the **#1 local organic ranking factor and #2 AI-visibility factor** (per Whitespark 2026) — the site has the page count (85 service pages) but none carry local qualifiers.
**Recommendation:** Add a Chennai/Tamil Nadu qualifier to at least the highest-intent service page titles/H1s/meta descriptions (e.g. "Private Limited Company Registration in Chennai — Fees & Process"), and add a short localized paragraph (service delivered in-person or remotely, Chennai office details, Tamil Nadu coverage) to the top few converting pages rather than relying solely on the shared footer.

### 4. No Google Maps embed or "Get Directions" link — Medium
**Evidence:** Searched all `<iframe>` occurrences in the rendered HTML of `/`, `/about`, `/contact` — the only iframe present on any page is the Google Tag Manager noscript fallback (`googletagmanager.com/ns.html`). No `maps.google.com` or `google.com/maps` string appears anywhere in the fetched HTML.
**Impact:** A Maps embed and/or direct "Get Directions" link on `/contact` is a low-effort trust and engagement signal, and it's one of the few GBP-adjacent signals verifiable directly from the website.
**Recommendation:** Embed a Google Maps iframe (with correct pin) on `/contact`, and add a "Get Directions" link pointing to the GBP listing/Maps place URL once claimed/verified.

### 5. No reviews, testimonials, or review schema on-site — Medium
**Evidence:** Searched home page HTML for "testimonial", "review", "rating", "stars", "Google Business", "Google reviews" — the only "review" hits are unrelated UI copy ("document review", "No-obligation requirement review"). No `aggregateRating` or `Review` schema present.
**Impact:** For a professional/compliance-services firm, client trust signals (testimonials with client type/location context, e.g. "Pvt Ltd registration for a Chennai-based startup") are a meaningful differentiator and align with the industry-specific check for trust signals in this vertical. Review velocity is also flagged in 2026 ranking research as a ranking-relevant factor (18-day freshness rule) — but that applies to the GBP listing itself, not the website.
**Recommendation:** Add a testimonials section (with client name/company + city where permission allows) and consider embedding live GBP reviews once the listing is confirmed/optimized.

### 6. NAP address is fully consistent everywhere it appears — Positive (not a gap)
**Evidence:** The exact string `"W-426A, Second Floor, 2nd Avenue, C Sector, Anna Nagar West, Chennai - 600 101"` appears identically in: the JSON-LD `address` field (all 3 pages), the sitewide footer (all 3 pages), and the `/contact` page visible body text. No formatting drift (abbreviations, "Anna Nagar" vs "Anna Nagar West", pincode variants) detected across any of the three sources checked.
**Impact:** This is genuinely good — address discrepancies are a common and damaging local SEO issue, and this site has none across the on-site sources auditable.

### 7. GSTIN + LLPIN displayed sitewide — Positive (industry-appropriate trust signal)
**Evidence:** Footer "Corporate details" block shows `GSTIN: 33AAFFF0744H1ZS` and `LLPIN: AAI-5319` on every page, matching the `taxID` and `identifier` fields in JSON-LD.
**Impact:** For a corporate-compliance-services firm, displaying verifiable registration numbers is a strong, vertical-appropriate trust signal (analogous to bar admission for legal or NPI for healthcare) and is already correctly implemented both visibly and in schema.

---

## What Works
- Address is 100% consistent across every source checked (JSON-LD, footer, `/contact` body copy) — no NAP address discrepancies found.
- GSTIN and LLPIN (Indian regulatory identifiers) are displayed sitewide and mirrored correctly in structured data — a strong, industry-relevant trust signal.
- `areaServed: "Tamil Nadu"` is present in schema and echoed in the footer as "Service area: Tamil Nadu" — the service-area message exists, just not surfaced deeply in on-page content.
- Site correctly avoids overclaiming as a walk-in retail location; the hybrid business-type framing (real office + remote service delivery) is roughly consistent with how the content is written.
- Structured data validates as well-formed JSON-LD (no syntax errors) and is emitted identically on every page sampled — a single shared source of truth, which is good for consistency (though the type/shape itself needs upgrading, see Finding 2).

## GBP Optimization Checklist (Website-Verifiable Only)

| Item | Status |
|---|---|
| Maps embed on-site | Missing |
| "Get Directions" / Maps link | Missing |
| Phone number (site + schema) | Missing |
| Review widget / testimonials | Missing |
| GBP posts indicator on-site | Missing / not applicable (no way to verify from site) |
| Primary GBP category correctness | **Unverifiable without Maps/GBP access** |
| Review count, rating, velocity | **Unverifiable without Maps/GBP access** |
| NAP match between site and GBP | Partially verifiable — site's address/name are clean and consistent; phone can't be compared since none exists on-site |

## Citation Presence (Tier 1 Directories)

**Not directly checked** — no live search or DataForSEO/business-listing API access in this environment (per context.md: no Google API credentials, no DataForSEO MCP, no Moz/Bing keys). Cannot confirm Yelp/BBB/JustDial/Sulekha/IndiaMART presence or NAP match on external directories from the website alone.

---

## Top 10 Prioritized Actions

1. **[Critical]** Add a business phone number sitewide (header/footer, `tel:` link) and to `/contact` — currently absent entirely.
2. **[Critical]** Add the phone number to JSON-LD as `telephone` + a `contactPoint` object; ensure it matches the GBP listing exactly once added.
3. **[High]** Upgrade JSON-LD `@type` from `Organization` to `ProfessionalService`/`AccountingService` (with `LocalBusiness` if multi-typing) and convert `address` to a structured `PostalAddress` object.
4. **[High]** Add `geo` (lat/long, 5-decimal precision) and `openingHoursSpecification` to the schema.
5. **[High]** Claim/verify/audit the Google Business Profile listing directly (cannot be done from the website — flagged as unverifiable here). Confirm primary category is correct for a corporate-compliance-services firm (this is the #1 local ranking factor and the #1 negative factor if wrong, per Whitespark 2026).
6. **[High]** Add Chennai/Tamil-Nadu-qualified titles, H1s, and meta descriptions to the top-converting service pages (e.g. Pvt Ltd registration, GST registration) rather than relying only on the shared footer for local relevance.
7. **[Medium]** Embed a Google Maps iframe and "Get Directions" link on `/contact`.
8. **[Medium]** Add a testimonials/reviews section with client-type/location context; add `aggregateRating`/`Review` schema once real review data exists (do not fabricate ratings).
9. **[Medium]** Establish/verify a review-generation workflow to keep GBP review velocity active — 2026 research (Sterling Sky) shows a ranking cliff after ~18 days without new reviews; this must happen off-site via GBP, but the site's testimonials CTA can support it.
10. **[Low]** Confirm and, where missing, build Tier-1 citations (Google, Bing Places, and relevant Indian directories such as JustDial/IndiaMART/Sulekha) once the phone number exists, so all citations can carry a complete and consistent NAP.

## Limitations Disclaimer

The following could **not** be assessed in this pass and should not be inferred from website content alone:
- **Google Business Profile** existence, verification status, primary/secondary category selection, photos, posts, Q&A, or messaging — no Maps/GBP API access in this environment.
- **Review rating, count, and velocity** (both on GBP and third-party sites) — no live review-platform access.
- **Tier-1 citation presence and NAP-match** on Yelp, BBB, JustDial, Sulekha, IndiaMART, etc. — no search API/DataForSEO access; would require live `site:` searches or citation-tracking tools.
- **Proximity/local-pack ranking position** — per the Search Atlas ML study, proximity accounts for ~55% of ranking variance and is entirely outside on-site control; not assessable from the website.
- **Multi-location page quality checks** (doorway-page swap test, per-location unique content %) — not applicable; this is a confirmed single-location business.
- Only `/`, `/about`, and `/contact` were fetched directly for this NAP/GBP-signal check; the ~85 individual `/services/*` pages were spot-checked for title/meta local-intent signals only (via files already fetched by other audit passes), not exhaustively re-verified for phone/address text.
