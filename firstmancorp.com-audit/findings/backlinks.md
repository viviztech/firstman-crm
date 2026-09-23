# Backlink Profile — firstmancorp.com

**Data tier:** 0 — Basic (Common Crawl + Verify crawler only). No Moz API key,
no Bing Webmaster key, no DataForSEO configured in this environment
(confirmed via `backlinks_auth.py --check`). No known-backlinks file was
supplied for this domain, so the verification crawler had nothing to check.

**Sources queried:**
- Common Crawl Web Graph (`commoncrawl_graph.py firstmancorp.com`) — release `cc-main-2026-jan-feb-mar`
- Backlink verification crawler — not run (no candidate URLs provided)
- Moz / Bing / DataForSEO — **not available**, not attempted

---

## Sanity check: is the domain in Common Crawl at all?

**No.** Common Crawl returned `in_crawl: false`, `in_rankings: false`,
`pagerank: null`, `harmonic_centrality: null`, with the note *"Domain not
found in Common Crawl data. It may be too new, too small, or not yet
crawled."*

This is stated plainly and should **not** be read as "zero backlinks
confirmed" or "low authority confirmed." Common Crawl is a sampled,
quarterly-refreshed web graph that under-represents small, new, and
geo-regional sites — absence from it means *CC hasn't seen the domain yet*,
not that the domain has no link equity. Given this site is a first-audit,
recently-launched Next.js marketing site for a single-location Chennai firm
(per `context.md`), non-inclusion in the current CC release is expected and
unsurprising — it is a coverage gap, not a finding of poor link health.

---

## Findings

### 1. No backlink data source has any record of this domain
- **Severity:** High (data gap — blocks confident scoring)
- **Evidence:** Common Crawl has no crawl/ranking record for
  `firstmancorp.com` (`in_crawl: false`, `in_rankings: false`,
  `pagerank: null`). Moz, Bing Webmaster, and DataForSEO are all
  unconfigured at this tier, so no referring-domain counts, DA/PA, spam
  score, or anchor text data could be retrieved from any source. No
  known-backlinks list was supplied, so the local verification crawler
  produced no results either.
- **Recommendation:** This is the top priority before any further backlink
  work: (1) connect Google Search Console for the domain — its Links report
  is free and is Google's own view of inbound links, independent of this
  tier's tooling; (2) add a free Moz API key (2,500 rows/month, no cost) to
  get DA/PA and a first referring-domain count; (3) re-run this Common Crawl
  check in ~3 months when the next quarterly web graph release ships, in
  case the domain has been picked up by then.

### 2. Likely genuinely thin backlink profile (opportunity, not a defect)
- **Severity:** Medium
- **Evidence:** Context confirms this is the first SEO audit for the domain,
  analytics (GA/GTM) were "just installed," and the business is a
  single-location regional professional-services firm with no mentioned
  history of digital PR, guest posting, or directory outreach. Combined with
  the Common Crawl absence, the most likely real-world state is a small
  number of inbound links (directory listings, possibly a few partner
  mentions) rather than a large hidden profile the tooling is failing to
  surface.
- **Recommendation:** Treat this as a build-from-near-zero opportunity
  rather than a remediation task. Prioritize link sources that are realistic
  for an Indian regional corporate-services firm:
  - **Local/business directories & citations:** Justdial, Sulekha, IndiaMART,
    Google Business Profile, Chennai/Tamil Nadu chamber of commerce
    directories — cheap, fast, and relevant for local-service intent.
  - **Chamber of commerce / trade association listings:** Madras Chamber of
    Commerce & Industry, Tamil Nadu Chamber of Commerce, CII/FICCI regional
    chapters — high relevance, often allow a member profile link.
  - **Guest content on Indian business/finance/startup publications:**
    contributed articles on topics like GST filing changes, MSME/Udyam
    registration, or trademark basics to outlets such as Inc42, YourStory,
    or CA/finance blogs — builds topical authority links in the exact niche.
  - **Referral/partner links from CA firms, company secretaries, and legal
    practices:** natural reciprocal-adjacent relationships (accountants and
    CS firms routinely refer clients for registration/compliance work and
    will often link from a "partners" or "resources" page) — low effort,
    high relevance.
  - **Resource-page link building from the existing `/resources` articles**
    (10 pages already in the sitemap per `context.md`) — these are a
    natural asset to pitch to finance/business blogs for citation once
    referring-domain tracking (Moz/GSC) is in place to measure results.

### 3. No confirmed negative signals — but this is a data absence, not a clean bill of health
- **Severity:** Low (informational)
- **Evidence:** No toxic-link, reciprocal-link-scheme, or spam-score data
  exists at this tier to flag anything negative.
- **Recommendation:** Do not report this as "clean backlink profile" in
  downstream summaries — it should be reported as "unmeasured." Re-assess
  once a real data source (Moz Spam Score, GSC, or DataForSEO) is connected.

---

## What works

Nothing can be positively confirmed as "working" in the backlink profile at
this data tier — there is no visibility into any existing inbound links,
good or bad. The one qualified positive: the site has no barriers to future
link equity flow (clean robots.txt, valid sitemap.xml with 101 URLs, HTTPS,
no crawl-blocking issues observed) — so once links are earned, the site is
structurally ready to receive and pass that equity. This is a technical
readiness note, not a backlink-profile strength.

---

## Category score

**35 / 100 — Backlink Profile (LOW CONFIDENCE / DATA-INSUFFICIENT)**

This is explicitly **not** a confidence-weighted health score computed from
the standard 7-factor model (referring domains, domain quality, anchor
text, toxic ratio, link velocity, follow/nofollow, geo relevance) — **0 of 7
factors had any real data source** at this tier. Per methodology, a
numeric score should not normally be produced under these conditions; this
35/100 is provided only because it was requested for audit-rollup purposes,
and represents a **neutral-to-cautious placeholder** for "unmeasured, likely
thin, no confirmed negative signals" — not a measured deficiency. It should
be treated as provisional and replaced as soon as Google Search Console,
Moz, or DataForSEO data becomes available. Confidence: 0.50 at best (Common
Crawl domain-level convention), effectively lower here since CC itself
returned no record.

---

## Validation

Ran `validate_backlink_report.py` against the collected Common Crawl result
prior to writing this report: **status PASS** (0 errors, 0 warnings, 1 info
— the CC non-coverage caveat above, which has been incorporated verbatim
into the Sanity Check section).
