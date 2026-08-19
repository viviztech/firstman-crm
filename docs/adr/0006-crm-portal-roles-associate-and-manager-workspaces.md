# 0006. CRM portal roles: `associate` employeeType, and Backoffice/Workforce manager workspaces

## Status

Accepted

## Context

ADR 0001 introduced `employeeType` (`internal` | `franchise`) governing assignedTo-vs-territory
scoping, and ADR 0002 introduced `team` (`sales` | `operations` | `null`) governing the
sales/operations pipeline split. Both are deliberately generic axes so the business can add more
values later without a new axis.

Two portal-role gaps surfaced once the Sales/Operations split was in daily use:

1. **Associates.** The business hires a category of internal executive — "associate" — who is
   scoped identically to a regular internal executive (assignedTo-only, no territory) but should
   be labeled distinctly in the UI (`Associate Sales` / `Associate Operations` rather than plain
   `Sales` / `Operations`) so managers can tell junior/associate staff apart from senior staff at
   a glance in listings and the dashboard greeting.
2. **Manager workspaces.** `manager` is one role, but two different people fill it in practice:
   a **Backoffice Admin** who does day-to-day data entry (raising enquiries and job cards on
   behalf of walk-in/phone customers, maintaining the catalog) and a **Workforce Manager** who
   spends their day allocating unassigned enquiries/job cards to executives and reviewing
   headcount-shaped views (`/settings/users`). Both need the full, unrestricted `manager`
   permission set underneath — this is a dashboard-presentation split, not a new permission
   tier — but landing both on the same generic manager dashboard meant neither got a workspace
   that matched their actual daily task.

## Decisions

1. **`employeeType` gains a third value, `associate`** (`src/db/schema/staff.ts`). It is scoped
   exactly like `internal` — `isAssignedEmployee` (`src/lib/scope.ts`) returns `true` for both,
   so every assignedTo-based visibility rule, round-robin candidate pool, and job-card assignment
   check treats `associate` and `internal` identically. The only place `associate` is
   distinguished from `internal` is presentation: `getPortalRole` (`src/lib/portal-role.ts`)
   labels an `associate` executive `Associate Sales` or `Associate Operations` (falling back to
   the team check first) instead of plain `Sales`/`Operations`. This keeps the decision
   low-risk — mislabeling a portal role is cosmetic, misscoping a data query is a security bug —
   and consistent with ADR 0001/0002's rule that new enum values default to the least-surprising
   existing behavior unless a reason forces a divergence.

2. **`team` gains two manager-only values, `backoffice` and `workforce`**, used purely to select
   which dashboard workspace a `manager` sees — not to restrict what they can do. Every
   permission check in the codebase that gates on `role === "manager"` is unchanged; `team` is
   read only by `src/app/(crm)/dashboard/page.tsx` (`isBackofficeAdmin` / `isWorkforceManager`)
   to choose which `RoleWorkspaceDashboard` workspace renders, and by `getPortalRole` for the
   greeting label. A manager with `team` unset defaults to the Backoffice Admin workspace (the
   more common case — the workspace split is a convenience, not a lockout, matching the
   "absence = unrestricted"/"absence = default" posture the other axes already use). The
   sidebar's per-team nav filtering (`AppSidebar`, ADR 0002) explicitly only applies to
   `role === "executive"` — a manager's nav is never filtered by `team`, since `backoffice`/
   `workforce` govern dashboard layout only, confirming this is presentation, not authorization.

3. **No new authorization surface, no new migration-worthy table.** Both additions are enum
   value extensions on the existing `employee_type`/`staff_team` Postgres enums
   (`drizzle/0016_add_crm_portal_roles.sql`) — `ALTER TYPE ... ADD VALUE`. `staff_service_assignments`-mandatory
   scoping (ADR 0004) and job-card pickup (ADR 0005) are untouched: an `associate` operations
   executive follows the exact same mandatory-service-scope and pickup rules as any other
   internal operations executive, since scoping never distinguishes `associate` from `internal`.

## Consequences

- Adding a fourth `employeeType` or a third manager workspace later is the same shape of change:
  extend the enum, extend `getPortalRole`'s label table, and (for a manager workspace) add a
  branch in `dashboard/page.tsx` + a new `Workspace` case in `RoleWorkspaceDashboard` — no schema
  redesign needed.
- Because `associate` is scoping-identical to `internal`, a report or query that filters
  `employeeType = "internal"` directly (bypassing `isAssignedEmployee`) will silently exclude
  associates. None currently do this — `isAssignedEmployee` is the only gate in use — but this is
  worth checking first if a future query adds its own `employeeType` filter instead of reusing
  the shared helper.
