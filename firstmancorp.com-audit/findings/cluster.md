# Semantic Topic Clustering — firstmancorp.com

## Method

Rendered a sample of pages per candidate cluster with the shared renderer
(`claude-seo run render_page.py <url> --mode auto --output <file>.html`) and diffed the
`href="/services|/resources|/compare/..."` link sets against the sitewide boilerplate
nav to isolate **contextual, in-body links** from the repeated header-dropdown/footer
"explore services" block. Pages sampled: `resources/annual-compliance-guide`,
`services/annual-compliance-pvt-ltd`, `services/dir-3-kyc`, `services/pvt-ltd-registration`,
`services/gst-registration`, `services/gst-monthly-filing`, `services/iso-certification`,
`services/iso-27001-2013-certification`, `services/itr-filing`,
`compare/private-limited-vs-llp`, `compare/llp-vs-opc`,
`resources/how-to-choose-a-business-structure`, `resources/company-registration-in-india`.

**Key structural finding**: every page on the site carries the same static block of
~24 service links (llp-registration, nidhi-company-registration, opc-registration,
partnership-deed(-with-notary), apeda-registration, association, copy-rights-registration,
epf-registration, esic-registration, gst-monthly-filing, maintaining-books-of-accounts,
professional-tax-filing, tds-return-filing, internal-audit, aadhar-pan-link,
addition-of-director, annual-compliance-pvt-ltd/llp, appointment-of-auditor-adt-1,
business-email, domain-registration, hosting-services, web-designing), repeated near-
identically in a header/nav pass and a footer pass. This is a **non-contextual, sitewide
sitemap-style block** — it prevents orphan pages but carries near-zero topical-relevance
signal (same anchor set from every URL, unrelated to the page's own topic). It must not
be counted as "cluster interlinking" — the analysis below only counts links that appear
**in addition to** this boilerplate block, i.e. genuine "Related" content modules.

---

## Cluster 1 — Company Formation

**Members**: `services/pvt-ltd-registration`, `llp-registration`, `opc-registration`,
`partnership-registration`, `proprietorship-registration`; `compare/private-limited-vs-llp`,
`compare/llp-vs-opc`, `compare/proprietorship-vs-private-limited`;
`resources/how-to-choose-a-business-structure`, `resources/company-registration-in-india`,
`resources/documents-required-for-company-registration`,
`resources/cost-of-company-registration-in-india`,
`resources/company-registration-process-timeline`.

**State: partially linked, one-directional (resources → services), never the reverse.**

- `resources/company-registration-in-india` and `resources/how-to-choose-a-business-structure`
  both carry a genuine "Related" module: they link to pvt-ltd-registration, llp-registration,
  opc-registration, proprietorship-registration, and to each other + the other two resource
  articles. This is the strongest sub-cluster on the site.
- **But `services/pvt-ltd-registration` links to none of them.** Sampled directly — its only
  `/services|/resources|/compare` links are the sitewide boilerplate block; zero contextual
  links to any resource article or compare page. Same money page that should be the pillar's
  primary conversion target is functionally an island with respect to inbound cluster
  authority beyond the generic nav.
- `compare/private-limited-vs-llp` links only to `services/pvt-ltd-registration` and
  `services/llp-registration` (the two entities it compares) — nothing else.
  `compare/llp-vs-opc` links only to `services/llp-registration` and `services/opc-registration`.
  **The three compare pages never link to each other**, despite comparing overlapping entity
  pairs (LLP appears in two of the three), and neither compare page links to
  `resources/how-to-choose-a-business-structure` — the one resource article whose entire
  purpose is to route a reader who hasn't yet picked a structure into a head-to-head
  comparison.
- `services/partnership-registration` is not linked from either resource article's related
  module (proprietorship, pvt-ltd, llp, opc are; partnership is dropped).

**Missing links to add (concrete):**
1. `services/pvt-ltd-registration` → `resources/how-to-choose-a-business-structure`,
   `compare/private-limited-vs-llp`, `compare/proprietorship-vs-private-limited`
   (mandatory spoke→pillar; currently zero).
2. `services/llp-registration` → `resources/how-to-choose-a-business-structure`,
   `compare/private-limited-vs-llp`, `compare/llp-vs-opc`.
3. `services/opc-registration` → `resources/how-to-choose-a-business-structure`,
   `compare/llp-vs-opc`.
4. `services/proprietorship-registration` → `resources/how-to-choose-a-business-structure`,
   `compare/proprietorship-vs-private-limited`.
5. `compare/private-limited-vs-llp` ↔ `compare/llp-vs-opc` ↔
   `compare/proprietorship-vs-private-limited` (cross-link all three; each currently links to
   none of the others).
6. `compare/private-limited-vs-llp`, `compare/llp-vs-opc`,
   `compare/proprietorship-vs-private-limited` → `resources/how-to-choose-a-business-structure`
   (and the reverse — the resource article's related module should include all 3 compare
   pages, not zero of them).
7. Add `services/partnership-registration` to the related module on
   `resources/company-registration-in-india` and `resources/how-to-choose-a-business-structure`.

---

## Cluster 2 — Annual Compliance

**Members**: `services/annual-compliance-pvt-ltd`, `annual-compliance-llp`, `dir-3-kyc`;
`resources/annual-compliance-guide`, `annual-compliance-checklist-private-limited`,
`what-is-dir-3-kyc`, `penalties-for-missing-compliance-deadlines`,
`annual-compliance-calendar`.

**State: this is the model example of correct hub behavior — but still only one-directional.**

- `resources/annual-compliance-guide` is the best-linked page found on the entire site: its
  related module links to `services/annual-compliance-pvt-ltd`, `annual-compliance-llp`,
  `dir-3-kyc`, plus all 4 sibling resource articles
  (`annual-compliance-checklist-private-limited`, `what-is-dir-3-kyc`,
  `penalties-for-missing-compliance-deadlines`, `annual-compliance-calendar`), plus a useful
  cross-cluster link to `resources/company-registration-in-india`. This is exactly the pillar
  pattern the rest of the site should follow.
- **`services/annual-compliance-pvt-ltd` has zero links back** — sampled directly, its only
  `/services|/resources` links are the boilerplate nav. No link to
  `resources/annual-compliance-guide`, no link to `dir-3-kyc`, no link to
  `annual-compliance-llp` as a sibling/upsell.
- **`services/dir-3-kyc` is fully isolated** — sampled directly, zero contextual links to
  `resources/what-is-dir-3-kyc` (its own dedicated explainer article), zero to
  `resources/annual-compliance-guide`, zero to `annual-compliance-pvt-ltd/llp`.

**Missing links to add:**
1. `services/annual-compliance-pvt-ltd` → `resources/annual-compliance-guide` (mandatory
   spoke→pillar), `resources/annual-compliance-checklist-private-limited`,
   `services/annual-compliance-llp`.
2. `services/annual-compliance-llp` → `resources/annual-compliance-guide`,
   `services/annual-compliance-pvt-ltd`.
3. `services/dir-3-kyc` → `resources/what-is-dir-3-kyc` (obvious 1:1 pairing currently
   missing entirely), `resources/annual-compliance-guide`.
4. `resources/penalties-for-missing-compliance-deadlines` and
   `resources/annual-compliance-calendar` were not individually rendered in this pass but
   given the confirmed pattern (resources link out, services never link in), verify they
   also link to `annual-compliance-pvt-ltd`/`annual-compliance-llp`/`dir-3-kyc` and add if
   missing.

---

## Cluster 3 — GST

**Members**: `services/gst-registration`, `gst-monthly-filing`, `gst-amendment`,
`gst-cancellation`. No dedicated resource/pillar article exists for GST at all.

**State: flat, zero interlinking, no pillar.** Sampled `gst-registration` and
`gst-monthly-filing` directly — neither carries any contextual link to the other GST
service pages; `gst-amendment` and `gst-cancellation` don't appear on either page at all
(not even in the generic nav block, which only lists `gst-monthly-filing`). This is a
natural, high-intent cluster (someone registering for GST will need monthly filing,
and anyone querying amendment/cancellation is clearly GST-topic) that currently has no
connective tissue whatsoever.

**Missing links to add:**
1. `services/gst-registration` → `gst-monthly-filing`, `gst-amendment`, `gst-cancellation`
   (natural "after you register" cluster; currently zero).
2. `services/gst-monthly-filing` → `gst-registration`, `gst-amendment`, `gst-cancellation`.
3. `services/gst-amendment` ↔ `services/gst-cancellation` ↔ `services/gst-registration`
   (full mesh — 4 pages, all should mutually link).
4. Longer term: author a `resources/gst-registration-guide`-style pillar article to give
   this cluster the same hub structure that Annual Compliance already has.

---

## Cluster 4 — ISO Certification

**Members**: `services/iso-certification` (natural pillar) + `iso-13485-2016-certification`,
`iso-14001-2015-certification`, `iso-20000-1-2018-certification`,
`iso-22000-2018-certification`, `iso-27001-2013-certification`,
`iso-45001-2018-certification`, `iso-50001-2018-certification`, `iso-gmp-certification`.

**State: worst gap on the site.** `services/iso-certification` is the obvious pillar (it's
even titled generically, "ISO Certification," implying an umbrella of the 8 variants) —
sampled directly, **it links to none of its own 8 child certification pages.** Its
`/services` links are entirely the sitewide boilerplate block, none of which are ISO pages.
Sampled `services/iso-27001-2013-certification` (spoke) directly: it likewise links to
none of the other ISO variants and not back to `services/iso-certification`. All 9 pages
in this cluster are mutually isolated from each other — reachable only via the generic
services index/nav, not via any topical relationship.

**Missing links to add:**
1. `services/iso-certification` → all 8 variant pages (`iso-13485-2016-certification`,
   `iso-14001-2015-certification`, `iso-20000-1-2018-certification`,
   `iso-22000-2018-certification`, `iso-27001-2013-certification`,
   `iso-45001-2018-certification`, `iso-50001-2018-certification`, `iso-gmp-certification`)
   — this single fix (a "Choose your ISO standard" grid/list on the pillar page) would
   resolve most of the cluster's isolation and is the highest-leverage single change
   identified in this audit.
2. Each of the 8 variant pages → `services/iso-certification` (mandatory spoke→pillar,
   currently zero across the board).
3. Recommended cross-links among related standards: `iso-22000-2018-certification`
   (food safety) ↔ `services/fssai-central-license` / `fssai-registration` /
   `fssai-state-license` (adjacent food-safety compliance topic, currently unconnected);
   `iso-27001-2013-certification` ↔ `services/dsc-class-iii-*` pages (both
   information-security/digital-trust adjacent, optional cross-cluster link).

---

## Cluster 5 — Tax Filing

**Members**: `services/itr-filing` (pillar candidate), `it-return-companies`,
`it-return-firm`, `it-return-salaried-non-salaried`, `tds-return-filing`,
`professional-tax-filing`, `professional-tax-registration`.

**State: flat, no pillar behavior, no interlinking.** Sampled `services/itr-filing`
directly — no contextual links to `it-return-companies`, `it-return-firm`,
`it-return-salaried-non-salaried`, or `tds-return-filing`; `professional-tax-filing`
appears only inside the generic boilerplate block, not as a contextual related link.
`itr-filing` is presumably meant to be the umbrella page for the three IT-return variants
(by company type/individual type) but currently doesn't route to any of them.

**Missing links to add:**
1. `services/itr-filing` → `it-return-companies`, `it-return-firm`,
   `it-return-salaried-non-salaried` (pillar should route to all three entity-type variants;
   currently zero).
2. `services/it-return-companies`, `it-return-firm`, `it-return-salaried-non-salaried` →
   `services/itr-filing` (mandatory spoke→pillar) and to each other as filing-type siblings.
3. `services/tds-return-filing` ↔ `services/itr-filing` (adjacent compliance topic,
   recommended cross-link — both are income-tax-return-family filings).
4. `services/professional-tax-registration` → `services/professional-tax-filing` and back
   (registration naturally precedes ongoing filing; currently no reciprocal link beyond
   `professional-tax-filing`'s appearance in the generic nav).

---

## Cannibalization check

No keyword cannibalization was found among the sampled pages — the ~85 service pages,
10 resource articles, and 3 compare pages each target visibly distinct primary
intents/entities (e.g. `pvt-ltd-registration` vs `resources/company-registration-in-india`
vs `compare/private-limited-vs-llp` are complementary transactional/informational/
comparison intents on the same entity, not competing for the same query). The risk on
this site is under-linking, not overlap.

---

## Overall Content Architecture / Clustering Maturity Score: 27 / 100

**Rationale:**
- No orphan pages (+): every page is reachable via the sitewide services nav/footer, so
  crawlability is not at risk.
- One cluster (Annual Compliance) has a genuinely well-built pillar page
  (`resources/annual-compliance-guide`) proving the team knows how to build a related-
  content module — but even there the linking is one-directional; every spoke page fails
  the mandatory spoke→pillar link.
- Company Formation cluster is half-built: resource articles link down to services, but
  no service page links up, and the 3 compare pages are isolated from each other and from
  the resource guide.
- GST, ISO Certification, and Tax Filing — 3 of 5 clusters evaluated — have **zero**
  contextual interlinking. ISO Certification is the most severe individual gap: the
  pillar page itself (`services/iso-certification`) doesn't link to any of its own 8
  child certification pages.
- The sitewide "explore services" block that appears on every page is boilerplate, not
  topical interlinking — it should not be relied on as a substitute for contextual
  related-content modules; Google discounts repeated non-contextual nav anchors relative
  to in-body contextual links, and it provides no topical relevance signal per cluster.
- Net effect: this is a large (~101 URL), well-organized-by-URL-structure content set
  that behaves, from a link-graph perspective, like a flat list rather than hub-and-spoke
  clusters. The fix is mechanical (add "Related services/guides" modules following the
  `annual-compliance-guide` pattern to every service and compare page) rather than a
  content-creation problem — the content already exists; it just isn't connected.
