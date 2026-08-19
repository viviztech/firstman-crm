# 0005. Self-service job card pickup for operations executives

## Status

Accepted

## Context

ADR 0002 established that a job card created by a Sales conversion starts unassigned — it
"belongs to Operations, not the sales executive who closed the deal" — and is picked up later "by
a manager or operations lead." ADR 0004 then made service scope *mandatory* for operations-team
executives: they can only ever be assigned a job card for a service they're explicitly scoped to.

Between those two decisions sat a gap: nothing actually *showed* an operations executive which
unassigned job cards existed, let alone let them claim one. `scopeCondition` in `orders.ts` scoped
internal executives strictly to `assignedTo = self` (spec §3's base rule), so an unassigned order
was invisible to them even if its service was exactly what they were scoped for — a manager had to
manually open the Job Cards list, find it, and assign it by hand every time. The business wants
operations executives to see this work themselves and take it, without a manager in the loop for
every single job card.

## Decisions

1. **Internal operations-team executives with a non-empty service scope additionally see
   unassigned, still-open job cards whose service is in that scope** — layered onto the existing
   `assignedTo = self` visibility as an `OR`, inside `scopeCondition` (`src/services/orders.ts`).
   This is deliberately narrow: franchise-type operations executives don't need it (they already
   see their whole pincode territory via `territoryCondition`, assignedTo or not), and an
   unscoped operations executive gets nothing extra — consistent with ADR 0004's "no scope, no
   job cards" stance, since they couldn't be assigned one anyway. "Still open" means the same
   `WIP_STATUSES` set the rest of the app already uses for active work, not the raw status enum.

2. **Visibility and the actual pickup action share one scope check.** A dashboard listing that
   showed a card the pickup action would then reject is worse than not showing it at all, so
   `listJobCardsAvailableToPickUp` filters with the identical `WIP_STATUSES` +
   `serviceIds`/`assignedTo IS NULL` conditions as the `scopeCondition` change, and
   `pickUpJobCard` reuses `assertOperationsAssigneeServiceScope` (ADR 0004) rather than
   re-implementing the scope rule a third time. A row an executive can see is always a row they
   can actually pick up.

3. **Pickup is a dedicated, minimal action — not a detour through the full edit form.**
   `pickUpJobCard(orderId, actor)` only sets `assignedTo`; it doesn't touch price, govt fee, or
   notes the way `updateOrder` does, because claiming work and editing its commercial terms are
   different actions with different intents. It re-fetches the order inside its own transaction
   with `isNull(orders.assignedTo)` in the `WHERE` clause, so a race between two executives
   clicking "Pick up" on the same card resolves to one winner and the loser gets a plain "no
   longer available" result (`null`) rather than an error — this is an expected outcome of
   contention over shared unclaimed work, not a failure.

4. **Surfaced on the operations-executive dashboard as its own tab and stat tile, not folded into
   "My Job Cards."** A new "Available to pick" tab (`OperationsExecutiveDashboard`) lists these
   job cards with both a "View" and a one-click "Pick up" action (`PickUpJobCardButton`, a small
   client-component island — the dashboard itself stays a server component). `JobCardTable`
   gained an optional `renderAction` prop so this tab could reuse the same table/mobile-card
   markup instead of duplicating it, defaulting to the existing plain "View" button everywhere
   else. The stat tile placed first in the row (ahead of "Total job cards") since it's the most
   actionable number on the page — colored purple when non-zero, slate when there's nothing to
   pick up, following the dashboard's existing color-means-something convention.

## Consequences

- `orders.ts`'s `scopeCondition` now composes an `OR` for internal operations executives, where it
  previously only ever `AND`ed conditions together for every other case — the first branch in that
  function to do so. `getOrder`/`listOrders`/`listOrderOptions`/`listOrdersForClient` all inherit
  this automatically since they share the one `scopeCondition` call.
- An operations executive can now discover and self-assign work a manager never manually routed to
  them, which was previously impossible through any UI path.
- `pickUpJobCard`'s activity-log action is `picked_up`, distinct from `updated`/`status_changed`,
  so the job card's Activity tab reads correctly ("picked_up" vs. a manager's "updated").
- One existing test needed no changes, but two new pickup tests initially failed for an unrelated
  reason: the `makeScope()` test helper builds a plain in-memory `ActorScope` and does not read
  `staff_service_assignments` from the database the way `getStaffScope()` does in production — so
  a test that calls `setStaffServiceAssignments` still has to pass `serviceIds` explicitly to
  `makeScope()` for the scope object it hands to `listJobCardsAvailableToPickUp`/`getOrder` to
  reflect that. `assertOperationsAssigneeServiceScope` (ADR 0004) doesn't have this gap since it
  reads the assignee's scope from the database directly rather than trusting the caller's
  `ActorScope`.

## Alternatives considered

- **A full operations round-robin auto-assignment**, mirroring the enquiry round-robin. ADR 0002
  already considered and deferred this for newly-created job cards specifically; self-service pickup
  is a lighter-weight answer to the same underlying complaint (unassigned work sitting invisible)
  without inventing a second rotation-cursor system.
- **Showing available job cards in the main `/orders` list with a filter, instead of a dashboard
  tab.** Rejected as the primary surface — an operations executive's dashboard is where they
  already look for "what's mine to do," and a manager-facing list view filter doesn't fit personal,
  action-oriented triage as well as a dedicated tab with an inline claim button. (Visibility itself
  *does* extend to `/orders` via `scopeCondition`, so the job card is still reachable and filterable
  there too — this is about where the primary "go claim work" affordance lives.)
