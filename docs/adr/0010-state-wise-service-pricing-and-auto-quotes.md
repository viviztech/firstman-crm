# 0010. State-wise service pricing and auto-sent enquiry quotes

## Status

Accepted

## Context

Company registration fees are not a single number: government-side components (Name Approval,
DSC, DIN, SPICe Form, MOA, AOA — stamp duty on MOA/AOA in particular) genuinely differ by state.
The catalog (`services.basePricePaise` / `services.govtFeePaise`, spec 4.3) only ever modeled one
flat price per service nationwide. The business asked for two things together: (1) a way to
manage a state-specific fee breakdown per service, and (2) an enquiry that names a service to
automatically receive a fee quote — by email/WhatsApp — at the moment it's submitted, whether from
the public marketing site, the partner API, or a staff member logging a walk-in.

## Decisions

1. **A new `service_state_prices` table, not new columns on `services`.** One row per
   `(serviceId, stateId)` holding a `feeComponents` jsonb array (`{label, amountPaise, perDirector}[]`) —
   mirrors the existing `checklistTemplate`/`requiredDocuments` jsonb-array convention on
   `services` rather than exploding into a `service_state_fee_components` child table, since the
   list is always edited as a whole (replace-all) and read as a whole. A service with no row for a
   given state keeps working exactly as before: `computeServiceQuote` (`src/services/
   service-pricing.ts`) falls back to a single "Professional fee" + "Government fee" line built
   from the flat `basePricePaise`/`govtFeePaise`, so this is additive — no existing pricing data
   or behavior changes until an admin explicitly configures a state.

   **A state's `feeComponents` are the government-side breakdown only — the Professional fee
   always leads the quote regardless.** The first version of this ADR had a gap here: once a state
   row existed, its components were the *entire* quote, silently dropping FirstMan's own service
   charge unless an admin manually duplicated it as one of the rows. Fixed by always prepending a
   `Professional fee` line (from `service.basePricePaise`) before the state-specific components,
   mirroring the flat-fallback path — so a configured state breakdown is additive on top of the
   professional fee, never a replacement for it. Reflected in the state-pricing editor's copy so
   admins don't duplicate it themselves.

   `perDirector` and `perLakhCapital` (added as same-ADR follow-ups) each mark a component whose
   real-world cost scales with something other than a flat one-time fee: DSC/DIN are issued one
   per director/partner, while MOA/AOA stamp duty is typically quoted per ₹1,00,000 (1 lakh) of
   authorized capital. `amountPaise` on such a row is the *rate for one unit*; `computeServiceQuote`
   takes optional `numberOfDirectors`/`capitalAmountPaise` values and multiplies flagged rows by
   the resolved director count and/or whole-lakh capital count (each floored, clamped to a minimum
   of 1 — capital additionally defaults to ₹1,00,000 when not given, a common minimum for a fresh
   registration — so a missing/zero/fractional input never zeroes out or inflates a quote). The two
   factors multiply independently, so a component can combine both. This turns each component into
   a `{label, qty, ratePaise, amountPaise}` line — the same qty/rate/amount shape `InvoiceLineItem`
   already uses, so the quote PDF's line-item table matches the invoice PDF's.
   `enquiries.numberOfDirectors`/`capitalAmountPaise` (nullable) are the source of these values,
   collected alongside the service/state fields on the marketing form, the internal enquiry form,
   and (state/directors/capital only, gated behind a `states` prop) the Pvt Ltd registration page's
   quick quote form, and snapshotted onto the generated `quotes` row.

2. **State matched by name, not a `stateId` FK on `enquiries`/`clients`.** `clients.state` was
   already a free-text column (not a `states` FK) matched by name against the `states` master
   table only where geography lookups need it (e.g. GST state code). `enquiries.state` follows the
   same convention for consistency, populated the same way `city` already is — typed directly, or
   autofilled from the pincode lookup that already exists for staff-facing forms
   (`lookupPincodeAction`). `computeServiceQuote` resolves the free-text name to a `states` row
   case-insensitively at quote time.

3. **A `quotes` table snapshots the breakdown, rather than computing it fresh every time it's
   viewed.** Once sent, a quote must keep showing what the enquirer actually received even if the
   catalog or state pricing changes later — the same reasoning `invoices.lineItems` already
   applies to a real invoice. `quotes` is deliberately not `invoices`: a quote is a non-binding
   estimate generated before any client/order exists, has its own `FMQT<yymm><seq>` numbering
   sequence, and is rendered with its own PDF template (`QUOTATION`, not `TAX INVOICE`/`PROFORMA
   INVOICE`) that says plainly it isn't an invoice.

4. **Quote generation and delivery is a pg-boss job (`enquiry-quote-issued`), enqueued next to the
   existing `enquiry-assigned`/`marketing-enquiry-received` calls** in every enquiry-creation path
   (`POST /api/v1/enquiries`, the marketing site's server action, and the internal CRM's "New
   enquiry" action) whenever the enquiry carries a `serviceInterestedId` — never computed inline
   in the request, per spec 4.8. The job creates the `quotes` row, sends the PDF as a WhatsApp
   document plus an emailed download link (mirroring `sale-proforma-notifications.ts`'s pattern
   exactly), and logs both attempts to `message_logs`.

5. **Admins manage state pricing on the existing service edit screen** (`/catalog/services/[id]/
   edit`), as a new "State-wise pricing" card below "Price history" — add/edit/remove one state's
   fee-component breakdown at a time, restricted to `super_admin`/`manager` like the rest of
   catalog management. No separate settings page was introduced since this is catalog data, not
   global configuration.

## Consequences

- Every service is always quotable, state-configured or not — the flat-price fallback means this
  ships without requiring state pricing to be back-filled for the whole catalog first.
- `QuickEnquiryForm` (the minimal name+phone capture on service detail pages) only collects
  state/service/directors/capital when a page explicitly opts in by passing `states` — currently
  only the Pvt Ltd registration page does, since it's the one page these fields are relevant to;
  every other service page keeps the plain name+phone form, so quotes generated from those pages
  use the flat fallback (or a state-blind default) same as before.
- A quote is generated even when the enquiry has no email on file — `notifyEmail` no-ops without
  one (existing behavior), and the WhatsApp document send still goes out.
- The flat fallback (no state pricing configured) is never director- or capital-scaled —
  `basePricePaise`/`govtFeePaise` are already single totals with no per-component rate to
  multiply, so `numberOfDirectors`/`capitalAmountPaise` only affect a quote once an admin has
  configured `perDirector`/`perLakhCapital` components for that service's state pricing.
