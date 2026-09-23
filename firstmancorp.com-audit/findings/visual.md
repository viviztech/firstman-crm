# Visual / Above-the-Fold Audit — firstmancorp.com

**Method**: Live Playwright screenshot capture (via `claude-seo run capture_screenshot.py`), desktop (1920x1080 rendered, tool default viewport) and mobile (375x812) viewports. Pages captured: homepage `/`, service detail `/services/pvt-ltd-registration`, pricing `/pricing` (including a full-page mobile capture of `/pricing` to check for table overflow / scroll depth to CTA).

## Screenshot capture status: SUCCESSFUL
All screenshots captured and saved to `d:\projects\firstman-crm\firstmancorp.com-audit\screenshots\`:
- `homepage-desktop.png`, `homepage-mobile.png`
- `service-detail-desktop.png`, `service-detail-mobile.png`
- `pricing-desktop.png`, `pricing-mobile.png`, `pricing-mobile-full.png` (full-page scroll capture)

---

## Findings

### 1. Pricing page hero has no primary CTA above the fold (desktop + mobile)
**Severity**: High

**Evidence**: `pricing-desktop.png` and `pricing-mobile.png` — the hero ("Professional fees, published upfront.") contains only a headline and one line of subtext; no button/CTA sits in the hero itself. The only CTA visible is the header's "Talk to an expert" button, which on mobile is hidden behind a hamburger icon (see Finding 2). The full-page mobile capture (`pricing-mobile-full.png`, 750x20220px) shows the page is a very long stacked table of 80+ services; a "Talk to an expert" style closing CTA ("Get a clear picture before you spend") only appears at the very bottom of the page.

**Recommendation**: Add a visible CTA button directly in the pricing hero (e.g., "Get a custom quote" / "Talk to an expert") so users who bounce before scrolling through the full table still have a conversion path. Consider a sticky/floating "Talk to an expert" bar on this page specifically, given its unusual length.

### 2. Primary CTA is hidden behind the hamburger menu on mobile across all pages
**Severity**: Medium

**Evidence**: `homepage-mobile.png`, `service-detail-mobile.png`, `pricing-mobile.png` — the mobile header shows only the logo and a hamburger icon; the desktop header's pink "Talk to an expert" button and "Client login" link are not present in the mobile header at all. Users must open the menu to find the primary contact CTA, whereas on desktop it's a single click from anywhere.

**Recommendation**: Surface a persistent, always-visible mobile CTA — e.g., a compact "Call" or "Talk to an expert" icon/button in the mobile header, or a sticky bottom action bar — rather than relying solely on in-page buttons and the hamburger menu.

### 3. Service detail page: callback CTA sits just below the mobile fold
**Severity**: Low

**Evidence**: `service-detail-mobile.png` — on a 375x812 viewport, the H1 ("Private Limited Company"), description, price ("From ₹10,999.00"), and timeline ("7 business days") are all visible without scrolling, but the "Get a callback today" form and its "Request a callback" button fall just outside the visible area, requiring one scroll.

**Recommendation**: Minor — consider trimming the description length or hero vertical padding slightly on mobile so the callback form's button is at least partially visible as a scroll affordance/CTA hint.

### 4. Header "Talk to an expert" CTA destination not verified
**Severity**: Low (informational)

**Evidence**: Static screenshots don't confirm whether the header CTA is a `tel:` link, a form anchor, or a separate contact page — for a services firm where prospects often want to call, a direct, visible phone number (not just a button) is a stronger trust signal than a generic CTA label.

**Recommendation**: If not already the case, display a click-to-call phone number in the header (desktop) and consider a `tel:` quick-action in the mobile menu, in addition to the "Talk to an expert" button.

---

## What works well

- **Above-the-fold clarity (desktop)**: Homepage hero delivers a clear value proposition ("Build the business. We'll manage the filings.") with a two-tier CTA (primary "Plan my requirements", secondary "Explore 81+ services") and three trust badges (Upfront professional fees, Dedicated case ownership, WhatsApp progress updates) — all visible without scrolling.
- **Above-the-fold clarity (mobile)**: The same headline, subhead, and primary CTA button are visible on mobile with only a small amount of scroll past the header; text is large and legible (H1 ~40px+, body ~18px).
- **Price transparency**: Both the service detail page and the dedicated pricing page foreground concrete numbers (₹10,999, 7 business days) rather than "contact us for pricing," which builds credibility for a compliance-adjacent purchase decision.
- **Mobile table responsiveness**: The pricing page's 80+ row fee table degrades gracefully on mobile into stacked label/value cards rather than a horizontally-scrolling table — no horizontal overflow observed in the full-page capture.
- **Trust/credibility signals in footer**: GSTIN, LLPIN, and a real registered office address ("Corporate Details" block) are printed on every page footer — appropriate and reassuring for a legal/compliance services business, reinforcing the structured data findings from the technical audit.
- **Visual hierarchy & brand consistency**: Consistent crimson/pink brand color, bold serif-free headline type, icon-labeled feature cards ("Business Lifecycle: Start / Enable / Operate / Protect"), and a stat bar (81+ services, 5 practice areas, Tamil Nadu coverage) communicate scale and process rigor — appropriate tone for a firm handling legal/financial filings.
- **No layout bugs observed**: No overlapping elements, text clipping, or broken responsive breakpoints found in any of the six captured screenshots.

---

## Category Score: 80 / 100

Strong, trust-appropriate visual design with a genuinely clear above-the-fold value proposition and price transparency — the two things that matter most for a compliance-services buyer. Score is held back primarily by CTA visibility gaps: the pricing page's hero lacks any direct CTA (a real conversion risk given the page is 80+ rows long), and the mobile header relies entirely on a hamburger menu with no persistent contact action.
