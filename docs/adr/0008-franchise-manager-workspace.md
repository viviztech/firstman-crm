# 0008. Franchise Manager workspace

## Status

Accepted

## Context

ADR 0007 gave each franchise (an `executive` with `employeeType = "franchise"`) their own commission
dashboard and territory hierarchy, scoped to their own single territory. There was no way for
whoever oversees the franchise *network as a whole* — assigning/removing territories, setting
commission rates, watching every franchise's sales and commission at a glance — to see all of that
in one place. That authority already existed (`super_admin`/`manager` can manage territories under
Settings → Franchise territories, ADR 0007); what was missing was a dashboard workspace for it.

This is the exact shape of change ADR 0006 anticipated: "adding a third manager workspace later ...
extend the enum, extend `getPortalRole`'s label table, and add a branch in `dashboard/page.tsx`."

## Decisions

1. **`staff_team` gains a fourth value, `franchise`**, manager-only like `backoffice`/`workforce` —
   it selects a dashboard workspace and carries no authorization meaning of its own. A manager with
   `team = "franchise"` still has the full, unrestricted manager permission set; `teamCondition`
   (`src/lib/scope.ts`) only ever applies to `role === "executive"`, so this value is invisible to
   every scoping/authorization check in the app.
2. **`getPortalRole` gains `"Franchise Manager"`**, checked before the generic manager fallback,
   same as `"Workforce Manager"`.
3. **A dedicated `FranchiseManagerDashboard` component, not a new `RoleWorkspaceDashboard` case.**
   `RoleWorkspaceDashboard`'s existing shape (a stat-card row plus a grid of quick-action tiles) fits
   backoffice/workforce because their job is "go do a list of things." A franchise-network overview
   is fundamentally a data rollup — one row per active territory with sales/expected/earned
   commission — which doesn't fit the quick-action shape. `FranchiseDashboard` (ADR 0007) already
   established the precedent of a bespoke per-workspace component for data-heavy content; this
   follows it instead of forcing the tile shape.
4. **`getFranchiseNetworkOverview` (`src/services/franchise-commissions.ts`) reuses the same
   territory-matching and commission math as a franchise's own dashboard** (`territoryCondition`,
   `calculateFranchiseCommission`) via a shared `computeTerritoryRows` helper, run once per active
   territory. This guarantees the network rollup and an individual franchise's own numbers can never
   drift apart into two competing implementations of the same calculation.
5. **The `StaffTeamSelect` admin control now filters options by role** (`src/components/settings/
   staff-team-select.tsx`): executives only ever see `sales`/`operations`; managers only ever see
   `backoffice`/`workforce`/`franchise`. Previously all four team values were offered to both roles
   from one shared list — harmless while every value only affected a manager's dashboard, but
   `franchise` and the two executive-only values (`sales`/`operations`) drive genuinely different
   scoping code paths (`teamCondition` gates the sales/operations pipeline split for executives), so
   an admin picking the wrong role's value is now structurally prevented rather than merely unlikely.

## Consequences

- Seeded via `franchise-manager@firstman.in` (`role: "manager"`, `team: "franchise"`) in
  `src/db/seed.ts`, alongside the existing `franchise@firstman.in` (an individual franchise's own
  login) — the two are deliberately separate accounts representing different personas.
- No new authorization surface: identical to ADR 0006, this is an enum value extension
  (`drizzle/0019_add_franchise_manager_team.sql`, `ALTER TYPE ... ADD VALUE`) plus a dashboard
  branch, not a new role or a new permission tier.
- A fourth manager workspace later is the same shape of change again, per ADR 0006's original
  consequence — extend the enum, extend `getPortalRole`, add a `dashboard/page.tsx` branch, and pick
  whichever presentation (tile grid vs. bespoke component) actually fits that workspace's content.
