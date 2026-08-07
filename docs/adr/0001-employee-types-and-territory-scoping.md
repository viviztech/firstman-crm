# 0001. Employee types, franchise territories, and service-scoped panels

## Status

Accepted

## Context

Spec §3 defines four fixed roles — `super_admin`, `manager`, `executive`,
`accountant` — with executives scoped at the service layer to
`assignedTo = session.userId`. The business now runs three kinds of people
doing sales/case work under the `executive` role:

1. **Internal employees** — today's behavior.
2. **External franchisees** — a franchise model with pincode-wise territory
   allocation. A franchise is a small local team, not a single person, so
   their visibility should be the whole territory, not just records
   individually assigned to them.
3. **External associates** — referral partners who do not use the CRM at
   all; they're a lead source tracked for commission.

Staff (internal or franchise) can additionally be assigned one or more
services from the catalog, so their panels only surface work relevant to
what they handle.

## Decisions

1. **`employeeType` is orthogonal to `role`, not a replacement.** A user is
   still e.g. `role = "executive"`; `employeeType` (`internal` | `franchise`)
   is a separate axis controlling *how* their visibility is scoped. This
   avoids retiring/renaming the `executive` role and keeps
   `super_admin`/`manager`/`accountant` untouched.

2. **`staff_profiles` is a new table keyed to `user.id`, not columns added to
   `user` itself.** The `user` table (`src/db/schema/auth-schema.ts`) is
   owned by better-auth's CLI generator, not hand-edited — the same reason
   `roleEnum` in `_shared.ts` was never wired onto `user.role` (see README
   Assumption #4), and the same conclusion README Assumption #10 already
   reached when it flagged that staff WhatsApp support would need "a phone
   field added to a separate staff-profile table (not `user` itself)."
   `staff_profiles` follows the standard `baseColumns()`/`actorColumns()`
   convention (soft-deletable, audited) like every other domain table.

3. **Franchise pincode scope is hard, not a routing hint.** A franchise-type
   executive's queries are filtered to their allocated pincode territory
   (`staff_pincode_allocations`), and that visibility is territory-wide —
   not limited to their own `assignedTo` rows. A franchise is modeled as a
   team covering an area, so any staff at that franchise can see (and be
   assigned) any record in their territory. Internal-type executives keep
   the original `assignedTo`-only behavior unchanged.

   A franchise with **zero** allocated pincodes fails closed: their
   territory condition matches nothing (`sql\`false\``), not everything.
   Getting this backwards would mean an unconfigured franchise account sees
   the entire company's data.

4. **Associates never get a CRM login.** They're modeled as a lightweight
   `referral_partners` table (name, phone, commission type/rate, active
   flag), linked from `enquiries.referralPartnerId` and copied to
   `clients.referralPartnerId` on conversion. `enquiries.source = "referral"`
   already existed as an enum value; `referralPartnerId` adds the specific
   attribution on top of it. No panel, no scoping rules — just an admin CRUD
   screen (`/settings/referral-partners`) for commission tracking.

5. **Service assignment filters data within existing menus — it does not
   restructure the nav.** `staff_service_assignments` (many-to-many
   `user` ↔ `services`) narrows what a staff member's Enquiries/Orders/
   Compliance lists show, via the same scoping mechanism as
   assignedTo/territory. `nav-config.ts`/`app-sidebar.tsx` are unchanged: no
   new top-level menu items are added or hidden per service assignment. This
   keeps the blast radius to the service layer and a settings admin surface,
   not a UI restructure.

   **A staff member with no service-assignment rows at all is
   unrestricted** — they keep seeing every service, exactly like before this
   change shipped. Only once an admin explicitly assigns one or more
   services does the filter kick in for that person. This also governs enquiry
   round-robin auto-assignment pool selection (see #7).

6. **Absence of a `staff_profiles` row (or of any `staff_service_assignments`
   rows) means "internal, unrestricted."** `getStaffScope()`
   (`src/services/staff.ts`) returns these defaults rather than requiring a
   backfill migration for every existing seeded/prod user. This is safe
   specifically because "internal, unrestricted" is a strict superset
   behavior of what every executive already had before this change — no
   existing user's visibility narrows by default.

7. **Enquiry round-robin auto-assignment is now pool-aware, with a
   pool-specific rotation cursor.** `pickRoundRobinAssignee`
   (`src/services/enquiries.ts`) computes a candidate pool per incoming enquiry:

   - If the enquiry's `pincode` is covered by a franchise's territory, the pool
     is that franchise's staff.
   - Otherwise the pool is internal-type executives.
   - If the enquiry has a `serviceInterestedId`, the pool is further narrowed to
     staff explicitly assigned that service — but only among staff who have
     *some* service assignment configured; staff with none stay eligible
     (rule #5).

   Each distinct pool gets its own settings-table cursor key
   (`enquiryRoundRobinCursor:<pool-description>`) instead of one global cursor,
   so a busy pincode's rotation can't starve the general internal rotation
   or vice versa.

8. **Scoping logic was centralized, not re-duplicated a second time.** Before
   this change, `scopeCondition`/`enforceAssignment` were copy-pasted with
   minor variations across `enquiries.ts`, `clients.ts`, `orders.ts`,
   `compliance.ts`, `analytics.ts`, and `search.ts`. Adding a second scoping
   axis (territory) and a third (service) to each of those independently
   would have multiplied an already-duplicated pattern. `src/lib/scope.ts`
   now exports `assignedToCondition`, `territoryCondition`,
   `territoryConditionViaClientIds` (for tables with only a `clientId` FK,
   resolved via a subquery against `clients.pincode`), `serviceCondition`,
   and a composing `visibilityConditions()` that every scoped query calls
   instead of hand-rolling its own condition.

## Consequences

- `ActorScope` (`src/lib/scope.ts`) grew from `{ userId, role }` to also
  carry `employeeType`, `pincodes`, `serviceIds`. `toScope()`
  (`src/actions/shared.ts`) became `async` because it now loads the actor's
  staff scope from the database — every call site across `src/actions/*.ts`
  and the handful of Server Components/route handlers that built an
  `ActorScope` literal directly needed `await toScope(user)` instead.
- Documents ownership checks (`src/services/documents.ts`) moved from a
  single `assignedTo === scope.userId` post-fetch check to an
  `isOwnerInTerritory()` helper that branches on `employeeType`, since a
  document's owner (client or order) needs its pincode resolved for the
  franchise case.
- Test files constructing `ActorScope` literals now use a shared
  `makeScope()` helper (`src/lib/test-scope.ts`) instead of `{ userId, role
  }` object literals, to avoid every integration test spelling out the new
  fields' defaults by hand.

## Alternatives considered

- **Replacing the `executive` role with `internal`/`franchise`/`associate`
  role values.** Rejected — associates never log in, so they can't be a
  role value at all; and folding franchise into the role enum would ripple
  into better-auth's own role-based session/permission plumbing
  (`src/lib/permissions.ts`) for no benefit over a plain data column.
- **Restructuring the nav per service assignment** (a GST-only associate
  never sees a Trademark menu item). Rejected for v1 — confirmed with the
  business that "custom panel" primarily means "don't show me other
  people's/territories'/services' data," not a different navigation
  structure. Data-filtering within the existing nav gets the requested
  outcome with far less surface area to test and maintain.
