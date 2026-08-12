# 0004. Mandatory service scope for operations-team job card assignment

## Status

Accepted

## Context

ADR 0001 introduced `staff_service_assignments` (a user ↔ service many-to-many) and a rule that
governs it everywhere it's consulted: no assignment rows at all means *unrestricted* — an
executive with no explicit service scope stays eligible for every service, keeping pre-ADR-0001
behavior for anyone an admin hasn't bothered to scope. That default is correct for visibility
(`serviceCondition` in `src/lib/scope.ts`) and for the enquiry round-robin candidate pool
(`filterByServiceAssignment` in `src/services/enquiries.ts`).

It is the wrong default for who a job card (order) actually gets assigned to. Operations-team
executives (ADR 0002) are the people who do the fulfillment work a job card represents — a
Pvt Ltd registration and a trademark objection require different skills. The business wants this
scoping to be **mandatory** for operations: an operations executive must be explicitly assigned a
service before a job card for it can land with them, full stop. An unscoped operations executive
should be assignable to *nothing*, not everything.

## Decisions

1. **The mandatory rule is enforced at the service layer, on the assignee's persisted scope, not
   the caller's.** `assertOperationsAssigneeServiceScope` (`src/services/orders.ts`) looks up
   `assignedTo`'s own `staff_profiles`/`staff_service_assignments` rows inside the same
   transaction, rather than trusting anything on the calling `ActorScope` — the actor assigning a
   job card (a manager, or an operations executive self-assigning via `enforceAssignment`) is
   frequently a different user than the assignee being checked. It throws a descriptive `Error`
   when the assignee is an operations-team executive whose scope doesn't include the order's
   `serviceId`, following the codebase's established pattern for business-rule rejections (see
   `updateEnquiryStatus`'s "must go through Sales action" error, and the hard completion gate in
   ADR 0002).

2. **The rule only ever narrows an operations executive's eligibility — it is a no-op for every
   other case.** Unassigned orders, non-operations assignees (sales-team, no-team, franchise,
   manager, super_admin), and operations executives who *are* scoped all pass through unchanged.
   This keeps ADR 0001's "no assignment = unrestricted" default intact for every role it was
   designed for; only operations-team executives get the inverted "no assignment = scoped to
   nothing" behavior, and only for the specific act of being assigned a job card — their order
   *visibility* (`serviceCondition` via `scopeCondition` in orders.ts) is untouched and still
   follows the ADR 0001 default. An operations executive with zero service assignments can still
   see every job card (nothing changed there); they just can't be made the assignee of one.

3. **Enforced on both create and edit paths.** `createOrderInTx` checks immediately after
   `enforceAssignment` resolves the final `assignedTo` (covering both a manager's explicit pick
   and an operations executive's forced self-assignment). `updateOrder` was restructured to fetch
   the existing order first — it needed the order's `serviceId` anyway, since `orderEditSchema`
   doesn't carry one (edits never change service) — bringing it in line with the pre-fetch pattern
   `updateOrderStatus`/`updateOrderTaskStatus` already use in the same file, rather than the single
   blind `UPDATE ... WHERE` it had before.

4. **The assignee picker is filtered to match, where the service is already known.**
   `listAssignableStaffForService` (`src/services/users.ts`) excludes operations executives not
   scoped to the given service from the same roster `listAssignableStaff` returns — everyone else
   is unaffected, same no-op rule as the enforcement itself. Wired into the job card edit page
   (`/orders/[id]/edit`), where the service is fixed and known. The *new* job card form
   (`/orders/new`) still uses the unfiltered `listAssignableStaff`, since the service is chosen in
   that same form and isn't known until submission — filtering it would need a service→eligible-
   staff map shipped to the client and kept in sync with the service `<Select>`, a meaningfully
   bigger change than this decision covers. The server-side check is authoritative either way
   (CLAUDE.md §3: "never trust the UI filter alone"); an invalid pick on the create form surfaces
   as the same clear rejection message instead of silently succeeding.

## Consequences

- An admin/manager assigning a job card to an operations executive who isn't scoped for that
  service now gets a clear, actionable rejection instead of a silent invalid assignment.
- An operations executive with no `staff_service_assignments` rows can no longer be assigned *any*
  job card (by anyone, including themselves) until an admin scopes them via Settings → Users →
  service assignments — this is the intended "mandatory" behavior, not a bug.
- `updateOrder` now does two round-trips (fetch existing, then update) where it previously did one
  blind conditional update — consistent with the rest of the file, and the existing-row fetch was
  already necessary to read `serviceId` for the scope check.
- One existing test (`orders.test.ts`, "leaves an operations-team executive's own-assigned
  visibility unaffected") needed an explicit `setStaffServiceAssignments` call added — it had been
  implicitly relying on the old "unscoped = unrestricted" default to assign an operations
  executive a job card.

## Alternatives considered

- **Extending `serviceCondition`/visibility scoping itself** so an unscoped operations executive
  sees nothing, instead of adding a separate assignment-time check. Rejected — the request was
  specifically about what an operations executive can be *assigned* ("can take"), not what they
  can *see*. Changing the shared visibility default would also ripple into every other caller of
  `serviceCondition` (enquiries, compliance, invoices), none of which asked for this.
- **Enforcing only in the UI (picker filtering) without a server-side check.** Rejected outright —
  every other authorization rule in this codebase is enforced at the service layer specifically
  because the UI filter can't be trusted alone (CLAUDE.md §3, restated in ADR 0001/0002). The
  picker filter here is a UX convenience on top of the real gate, not a substitute for it.
- **Reusing `filterByServiceAssignment` from `enquiries.ts` directly.** Considered, but its
  semantics (unrestricted-by-default candidate narrowing for round-robin) are the opposite of
  what's needed here (mandatory-scoped rejection for operations specifically) — sharing it would
  have meant threading a "flip the default" flag through code that exists to encode one specific
  default. A separate, small function was clearer than a parameterized shared one for two call
  sites with genuinely different rules.
