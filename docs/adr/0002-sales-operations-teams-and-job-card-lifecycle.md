# 0002. Sales/Operations teams, per-service job cards, and the payment-gated completion flow

## Status

Accepted

## Context

ADR 0001 introduced `employeeType` (internal | franchise) as an axis orthogonal to `role`,
governing *where* an executive's visibility is scoped (assignedTo vs. territory). The business
now also organizes executives into two functional teams that work entirely different stages of
the pipeline:

1. **Sales** — enquiries, follow-ups, and the Sales conversion action.
2. **Operations** — fulfillment of converted jobs ("job cards").

Separately, the business wants the CRM to (a) support closing a sale for multiple services in
one step, each with its own job card and its own proforma invoice, (b) present job-card work as
a single live-tracking page rather than a PDF, (c) hard-block a job card from being marked
complete until both its work and its payment are actually done, and (d) move to new,
purpose-specific numbering formats for customer IDs, job cards, proforma invoices, and tax
invoices.

## Decisions

1. **`team` is a second axis orthogonal to `role`, following the exact shape of `employeeType`
   (ADR 0001), not a third role value.** A user is still `role = "executive"`; `team`
   (`sales` | `operations` | `null`) lives on `staff_profiles`, the same table `employeeType`
   lives on (`src/db/schema/staff.ts`). `null` means unrestricted (visible to/eligible for both),
   mirroring ADR 0001's rule that absence of scoping data never narrows access below what
   existed before the feature shipped — no backfill migration was needed for existing users.

2. **Team is enforced at the service layer, not just the nav.** ADR 0001 decision #5 chose to
   *not* restructure the nav for service assignment, filtering data within existing menus
   instead. Team is different: Sales and Operations genuinely work different modules
   (Enquiries vs. Job Cards), so the nav *does* filter per-team (`src/components/nav-config.ts`'s
   `teams?: StaffTeam[]`, checked in `app-sidebar.tsx`), and the query layer enforces the same
   boundary via `teamCondition()` in `src/lib/scope.ts` — an operations-team executive querying
   `enquiries` gets `sql\`false\``, and a sales-team executive querying `orders` gets the same.
   This keeps faith with the standing rule that the UI filter is never trusted alone.

3. **Assigning a newly-created job card no longer defaults to the sales executive who closed
   the sale.** Before teams existed, the same person created and (implicitly) owned an order.
   Now, Sales conversion creates a job card that belongs to Operations. `createOrderInTx`'s
   caller-supplied `assignedTo` is left `undefined` by `closeEnquiryAsSale`, and
   `enforceAssignment` in `orders.ts` only forces self-assignment for `team === "operations"`
   actors, not every internal-type executive. A newly-created job card is unassigned until a
   manager or operations lead picks it up. A full operations round-robin (mirroring the existing
   enquiry round-robin) was considered and deferred — see Alternatives.

4. **Each service in a multi-service sale gets its own order (job card) and its own proforma
   invoice — not one order with N line items, or one proforma with N line items.** Orders were
   already 1-service-each; `closeEnquiryAsSale` (`src/services/enquiries.ts`) keeps that
   invariant under multi-service Sales conversion by looping `createOrderInTx` +
   `createProformaInvoiceInTx` once per selected service inside the same transaction as the
   client dedup/create step, rather than introducing a many-to-many orders↔services relationship.
   An invalid line anywhere rolls back the whole sale, client included.
   `enquiries.convertedOrderId` — a single nullable FK — points at only the *first* job card
   created; every job card from the sale is still discoverable via the client's Job Cards tab.

5. **The Job Card stays at `/orders/[id]`, relabeled in UI copy only.** No new route tree or
   component reorganization — the existing tabbed page became a single scrollable page, and
   "Order" became "Job Card" in user-facing text (nav, list page, client tab, dashboard,
   reports, dialogs), but `orderId`/`orderNo`/table/variable names are untouched. (The
   enquiries→leads rename was considered as precedent but turned out to be a full structural
   rename — routes, files, tables; a heavier change than this decision needed, so it wasn't
   followed literally.)

6. **"WIP" is a UI-only grouping label, not a schema change.** `order_status` keeps its existing
   seven values; `pending`/`docs_awaited`/`in_progress`/`govt_processing`/`on_hold` are jointly
   badged "WIP" on the Job Card header via a pure `isWipStatus()` helper (`src/lib/badges.ts`),
   avoiding an enum migration for a purely presentational milestone.

7. **Completion is hard-gated on tasks-done AND proforma-paid, with a `super_admin`-only,
   explicitly-audited bypass.** `updateOrderStatus` (`src/services/orders.ts`) throws a
   descriptive `Error` — the established pattern in this codebase (see `updateEnquiryStatus`'s
   "must go through Sales action" error) — rather than silently no-opping, when either condition
   fails on a transition to `"completed"`. Orders with no proforma at all (created outside the
   Sales/proforma flow) are exempt from the payment half of the gate, since they were never
   billed that way. Bypass is restricted to `super_admin` (not `manager`) via an explicit
   `{force: true}` option re-checked against `actor.role` server-side — never trusted from the
   client alone — logged as a distinct `status_changed_forced` activity action, because the
   gate's entire purpose is preventing unpaid/incomplete work from being marked done, and that
   judgment call belongs to the same role already trusted with irreversible actions elsewhere
   (hard-deleting a lost enquiry).

8. **New numbering formats are prospective-only.** Customer ID (`FM<year><6-digit seq>`), job
   card number (`FMJC<yy><mm><5-digit seq>`, monthly), proforma invoice
   (`FMPI<yy><mm><5-digit seq>`, monthly), and tax invoice (`FMINV<yy><5-digit seq>`, yearly —
   split off the sequence it used to share with proforma invoices) all switch to their new
   formats for records created after this shipped; existing rows keep their old-format values.
   No retroactive renumbering — the same posture this codebase already had for `orderNo`/
   `invoiceNo` before this change existed. All four sequences reuse the same
   `getSettingForUpdate`/`setSetting` row-lock pattern already established by the original
   `generateOrderNo`/`generateInvoiceNo`, just with new key names and cadences.

9. **Customer uniqueness (phone, email, CIN) is enforced at the database level, scoped to
   non-deleted rows, with phone winning dedup conflicts.** `clients.phone`/`email`/`cin` each
   get a partial unique index (`WHERE deleted_at IS NULL`, per-column) so a soft-deleted
   client's identity never blocks a genuinely new customer from reusing the same phone or email.
   `convertEnquiryToClientInTx` now dedups by phone *or* email (previously phone-only); when
   phone matches one existing client and email matches a *different* one, phone wins — it's the
   mandatory, always-collected field, while email is optional and more typo-prone — and the
   conflict is logged (`dedup_conflict_phone_precedence`) for staff review rather than silently
   resolved or blocking the sale outright.

## Consequences

- `ActorScope` (`src/lib/scope.ts`) grew a `team: StaffTeam | null` field, loaded by
  `getStaffScope()` alongside `employeeType`/`pincodes`/`serviceIds`. `src/lib/test-scope.ts`'s
  `makeScope()` gained a matching `team` override.
- `invoices` gained a second numbering sequence (proforma vs. tax), each with its own
  settings-table cursor key and reset cadence — `generateInvoiceNo` was retired in favor of
  `generateProformaInvoiceNo`/`generateTaxInvoiceNo`. Both `orders.ts` and `invoices.ts` also
  expose pure, DB-free formatting helpers (`jobCardYearMonth`/`formatJobCardNo`,
  `proformaYearMonth`/`formatProformaInvoiceNo`, `taxInvoiceYear`/`formatTaxInvoiceNo`) so
  month/year-boundary behavior is unit-testable without touching Postgres or faking global
  timers — `vi.useFakeTimers()` combined with real DB I/O was tried first and found to reliably
  break subsequent tests in the same file.
- `clients` gained a `cin` column and real uniqueness constraints on `phone`/`email` that did not
  exist before. Applying those constraints required a pre-migration duplicate-data audit in every
  environment — a genuinely different risk profile than every other purely-additive migration in
  this codebase to date.
- `enquiries.convertedOrderId` no longer represents "the" job card from a sale, only the first of
  potentially several — callers that assume 1:1 need to query the client's job cards instead.
- `closeEnquiryAsSaleInputSchema` changed shape from a single `serviceId`/`quotedPricePaise`/
  `govtFeePaise` to a `services: [...]` array; the Sales dialog now uses a repeatable row editor
  (`SalesServiceLinesEditor`) instead of one Select + two money inputs, following the same
  hidden-JSON-field pattern already used by `InvoiceLineItemsEditor` for FormData array encoding.
- The hard completion gate changed what's reachable through the normal flow: an order can no
  longer be "completed but its proforma still unpaid" except via the super_admin force-complete
  path. An existing regression test that exercised exactly that ordering (payment landing after
  completion) was rewritten to reach that precondition through the force-complete bypass instead
  of a plain manager completion.

## Alternatives considered

- **Modeling Sales/Operations as new `role` values** (`sales_executive`/`ops_executive`
  replacing `executive`). Rejected for the same reason ADR 0001 rejected folding franchise into
  the role enum: it would ripple into better-auth's role/permission plumbing for no benefit over
  a plain data column, and `manager`/`accountant`/`super_admin` need to stay team-unrestricted,
  which a role split would complicate rather than simplify.
- **Operations round-robin auto-assignment for newly-created job cards**, mirroring the existing
  enquiry round-robin. Deferred — the requirement only asked that operations executives be "the
  ones assigned `order.assignedTo`," not that assignment be automatic. Leaving new job cards
  unassigned (for a manager to triage) ships the correctness fix (job cards are no longer
  invisible to Operations) without inventing a second round-robin pool/cursor system in the same
  change.
- **Hard schema rename of `in_progress`/`govt_processing` to a `wip` enum value.** Rejected —
  would collapse two operationally distinct statuses into one, lose information the status
  timeline currently displays, and require an enum migration for a label the business only asked
  to *see*, not to *store* differently.
- **Renaming the `/orders` route and `orders` table to `/job-cards`/`job_cards`**, matching how
  the enquiries→leads rename actually worked (a full structural rename, not just copy). Rejected
  as disproportionate for this change: it would break bookmarked/shared URLs, require a real
  table rename migration, and add redirect/testing surface area for a request that was about the
  *page becoming interactive*, not about the entity's identity changing.
- **Blocking the sale outright on a phone/email dedup conflict**, forcing staff to manually
  resolve it before the sale could proceed. Rejected — a live sales conversion shouldn't stall on
  a data-hygiene edge case; a logged, reviewable soft-resolution (phone wins) is better for the
  business than blocking revenue at the point of sale.
