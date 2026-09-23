# Performance / Core Web Vitals Audit — firstmancorp.com

**Method:** Lab-only. No Google API credentials in this environment, so no CrUX
field data (28-day real-user percentiles) — all figures below are estimated
from response headers, resource inventory, and static timing (`curl`,
`render_page.py --mode auto`), not a real Chrome trace. Treat LCP/INP numbers
as directional, not authoritative; validate against PageSpeed Insights /
CrUX-vis once field data is available for this domain.

**Pages sampled:** `/` (homepage), `/services/annual-compliance-pvt-ltd`
(representative service detail — hero + enquiry form + FAQ), `/pricing`
(large server-rendered comparison table, 11 tables / 92 rows).

## Category score: 78 / 100

Solid foundation (full static/ISR caching, self-hosted fonts with
`font-display: swap`, disciplined `next/image` usage, all JS chunks
non-blocking `async`) held back by a heavy render-blocking CSS bundle, an
oversized shared JS chunk, and a GTM/GA setup that front-loads a third-party
network connection during the critical rendering path. No critical failures.

## Core Web Vitals estimates (lab, per page)

| Page | LCP (est.) | Status | INP (est., proxy via main-thread work) | Status | CLS (est.) | Status |
|---|---|---|---|---|---|---|
| `/` | ~1.9–2.3s | PASS (good, <2.5s) | ~120–220ms (mid-tier mobile) | PASS / borderline | ~0.01–0.03 | PASS |
| `/services/annual-compliance-pvt-ltd` | ~2.0–2.4s | PASS, closer to threshold | ~130–230ms | PASS / borderline | ~0.01–0.03 | PASS |
| `/pricing` | ~2.0–2.5s | PASS, closest to threshold | ~140–240ms (large DOM) | PASS / borderline | ~0.01–0.02 | PASS |

Thresholds: LCP good ≤2.5s, INP good ≤200ms, CLS good ≤0.1. All three pages
are estimated to **pass** on lab heuristics, but the service and pricing
pages sit close enough to the LCP/INP "good" ceiling that real mid-tier
Android/3G-4G field data (the realistic user profile for this India SMB
audience) could tip them into "needs improvement" — this is exactly the gap
CrUX field data would resolve and lab estimation cannot.

## Findings

### 1. Render-blocking CSS bundle is large for a marketing site (~120KB combined) — Medium
**Evidence:** Three render-blocking `<link rel="stylesheet">` on every page:
`9185d768e5410230.css` (4.1KB), `ec63f5d72ae759f8.css` (**114.6KB**),
`ac08b6f58894f355.css` (1.3KB) — same three files, unchanged across `/`,
the service page, and `/pricing`, confirming it's the global Tailwind 4
bundle rather than per-route CSS. All three are classic render-blocking
`<link>` tags (no `media` gating, no critical-CSS split), so ~120KB must be
downloaded and parsed before first paint on every page.
**Impact:** Directly gates LCP (text-based hero) since first paint waits on
this CSS. 114KB is large for a Tailwind 4 JIT-purged bundle on a template
this size — suggests either insufficient purging (unused utility classes
surviving tree-shaking, e.g. from shared component libraries or dynamic
class-name construction that defeats Tailwind's static analysis) or that
route-level CSS isn't being code-split by Next.js's per-page CSS chunking.
**Recommendation:** Audit the Tailwind config's `content` globs for
over-broad matches; check for dynamic `className` string concatenation that
Tailwind can't statically extract (forces safelisting); confirm Next.js CSS
chunking is producing per-route bundles rather than one global stylesheet.
Target <50KB combined render-blocking CSS.

### 2. GTM/GA `<link rel="preload">` front-loads a third-party connection into the critical path — Medium
**Evidence:** `<head>` on every page contains
`<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-7KCYVDSDT2" as="script"/>`.
Confirmed in the RSC payload that both GTM and gtag are correctly wired with
`strategy="afterInteractive"` (execution correctly deferred past hydration —
this part is done right, not a beforeInteractive/blocking mistake). But
Next.js's `next/script` component emits a `preload` resource hint for
`afterInteractive` scripts at SSR time regardless of deferred execution,
which makes the browser open a fresh DNS/TLS connection to
`googletagmanager.com` and start the byte transfer **immediately**, in
parallel with — and competing for bandwidth/connection slots against — the
render-blocking CSS, preloaded fonts, and hero JS chunks that actually gate
LCP.
**Impact:** On constrained mobile/4G connections (the realistic profile for
much of this site's Tamil Nadu audience) this is a genuine, measurable
LCP-competing resource even though the script doesn't execute until later.
This is the direct, specific effect of the just-added GA/GTM install worth
flagging: it's implemented correctly (deferred execution) but the automatic
preload hint partially undercuts that deferral at the network layer.
**Recommendation:** Two options: (a) accept the preload as a minor, bounded
cost (single small request, ~few KB) and move on — it is not a blocking
script; or (b) if squeezing every ms of LCP matters, load GTM/gtag via a
manually-constructed `<Script strategy="lazyOnload">` or an idle-callback
loader instead of `next/script afterInteractive`, which avoids the SSR
preload hint entirely at the cost of slightly later analytics initialization
(acceptable for analytics, unlike conversion-critical scripts).

### 3. GTM container is an opaque third-party script loader — main-thread stacking risk for INP — Low/Watch
**Evidence:** The GTM loader script (`gtm.js`) is injected via
`insertBefore` synchronously as soon as the `afterInteractive` script runs,
i.e., immediately after hydration completes — the same moment the largest
shared JS chunk (`1255-a574b41ef0f3c81c.js`, **177KB**, see Finding 4) is
also parsing/executing. GTM's own container can load an arbitrary number of
additional third-party tags (pixels, chat widgets, heatmaps) that this
static audit cannot see or measure — its downstream cost is invisible until
someone adds tags inside the GTM container itself.
**Impact:** Not a current problem (only GA4 is configured today per
context.md), but it's a standing INP risk: every future tag added *inside*
GTM (rather than reviewed as code) bypasses the engineering team's normal
script-budget discipline.
**Recommendation:** Treat GTM container tags as code — require the same
review/perf-budget discipline for anything added inside GTM as for
first-party script changes. Reassess INP after any new GTM tag ships.

### 4. Oversized shared JS chunk on every route (177KB) — Low/Medium
**Evidence:** `_next/static/chunks/1255-a574b41ef0f3c81c.js` = **177,275
bytes**, loaded `async` on `/`, the service page, and `/pricing` alike — by
far the largest of the ~15-20 chunks per page (next-largest is 27KB). Being
`async` (not `defer`/blocking), it doesn't delay first paint, but it does
still have to parse and execute on the main thread during/after hydration.
**Recommendation:** Identify what's in this chunk (likely a shared
vendor/icon-library/UI-primitives bundle pulled into the root layout) and
check whether it can be route-split so pages that don't need it (e.g.
`/pricing`, which is a static table with minimal interactivity) don't pay
its parse/exec cost.

### 5. `/pricing` ships a large, fully server-rendered table with no apparent pagination — Low
**Evidence:** 11 `<table>` elements, 92 `<tr>` rows, 202.6KB raw HTML — the
heaviest of the three sampled pages. All static server-rendered markup (no
raw `<img>`, no obvious client-side sort/filter JS detected in this static
pass).
**Impact:** Low direct CWV risk since it's static markup (no CLS from
late-injected rows, no LCP image), but it's the largest DOM of the three
templates and worth monitoring if any client-side interactivity (sort,
filter, search) is added later — large DOM + client JS is a classic INP
failure mode.
**Recommendation:** No action required today; if search/sort/filter is added
to this table, virtualize or paginate rather than rendering all 92 rows with
client-side handlers.

### 6. TTFB is healthy but confirm it holds from India-local vantage points — Info
**Evidence:** `X-Nextjs-Cache: HIT`, `X-Nextjs-Prerender: 1, 1`,
`Cache-Control: s-maxage=31536000` on all three sampled pages — full static
ISR/prerender cache hits, no per-request server rendering. Measured TTFB
from this audit environment: ~160-200ms (`/` 0.160s, service page 0.202s,
`/pricing` 0.180s). Given this is a network-distance-dependent measurement
from an unknown vantage point (not confirmed India-local), treat these as an
upper bound — real users physically close to the Coolify host are likely
faster.
**Impact:** None currently — this confirms the caching layer is working as
intended (context.md's observation about `s-maxage=31536000` + cache HIT is
correct and is a genuine strength, not a finding requiring action).
**Recommendation:** None. Re-verify with CrUX field TTFB (`experimental_ttfb`
CrUX metric or PSI field data) once available to confirm real-world numbers
match this lab estimate.

## What works

- **Static caching/ISR is textbook.** Every sampled page returns
  `X-Nextjs-Cache: HIT` + `X-Nextjs-Prerender: 1, 1` + `s-maxage=31536000` —
  pages are served from Next.js's full-route cache with no per-request
  server work, which is close to ideal for TTFB/LCP.
- **Fonts are self-hosted correctly via `next/font/google`** (Fraunces +
  Inter): served from `/_next/static/media/*.woff2` on the same origin (no
  extra `fonts.googleapis.com`/`fonts.gstatic.com` connection), preloaded in
  `<head>`, and CSS confirms `font-display: swap` — this is exactly the
  recommended pattern and avoids the common FOIT/extra-origin-latency
  problem.
- **Images use `next/image` exclusively** — every `<img>` found across the
  three sampled pages carries `data-nimg`, explicit `width`/`height`
  attributes, and a responsive `srcSet` served through `/_next/image`. No
  raw unoptimized `<img>` tags found, and explicit dimensions on every image
  mean no CLS risk from image loading.
- **No render-blocking synchronous `<script>` tags.** All Next.js JS chunks
  load with `async`; the one `noModule` polyfill script is legacy-only and
  non-blocking for modern browsers.
- **GA/GTM installation follows the correct deferred pattern**
  (`strategy="afterInteractive"` for both, not `beforeInteractive`), and is
  env-gated per context.md — the *intent* here is sound engineering; Finding
  #2 is a second-order effect (the automatic preload hint), not a mistake in
  the strategy choice itself.
- **Strong security header baseline** (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options) doesn't cost any measurable performance overhead
  and is worth noting as a co-benefit of the same response pipeline.

## Priority recommendations

1. **Audit/trim the 114.6KB render-blocking CSS bundle** (Finding 1) —
   highest-leverage fix for LCP across all templates since it's shared
   site-wide.
2. **Investigate the 177KB shared JS chunk** (Finding 4) for route-splitting
   opportunity, especially to keep it off simple static pages like
   `/pricing`.
3. **Accept or consciously trade off the GTM/GA preload hint** (Finding 2) —
   cheap to leave as-is, cheap to fix via a manual lazy-load pattern if LCP
   margins are tight after Finding 1 is resolved.
4. **Get CrUX field data flowing** (via PSI API key or CrUX API access) as
   soon as this domain has enough Chrome traffic — lab estimates here are
   directional only and the 75th-percentile field measurement is what
   Google actually scores.
