# 0011. Combined Sales and Operations membership

## Status

Accepted

## Context

One staff user needs to work in both Sales and Operations. These are functional teams on
`staff_profiles.team`, separate from the authentication roles in `user.role`. Changing the
authentication role to a list would break role equality checks and risk broadening record access.
Leaving the team unset already allows both module lists for legacy users, but does not grant
Operations pickup, the Operations dashboard, or mandatory service-assignment checks.

## Decisions

- Add `sales_operations` to the existing PostgreSQL `staff_team` enum, displayed as
  **Sales & Operations**. Keep the user's base role `executive`. This supports the requested
  combination without replacing the existing role and employee-type model.
- Centralize explicit membership in the client-safe `hasStaffTeam` helper. Combined membership
  matches Sales and Operations; it does not match manager workspaces. Legacy unset-team module
  visibility remains unchanged and does not become explicit Operations membership.
- Use membership consistently for service-layer module access, job-card assignment and pickup,
  assignee filtering, navigation, and the two dashboard workspaces. The existing owner, territory,
  service, and base-role restrictions still apply. Associates can also use this combination.
- Operations service assignments remain mandatory before a combined user can receive or pick
  up a job card. The same service assignments continue to narrow Sales visibility when configured,
  as they already do for all executives; this change does not introduce separate service scopes
  for the two workflows.
- Sales conversion explicitly creates unassigned job cards, including for combined users. A
  trusted, server-only `assignmentMode: "sales_handoff"` option on `createOrderInTx` preserves
  this handoff without changing the actor's identity or role. Direct Operations creation and
  editing retain executive self-assignment. A combined user can subsequently pick up eligible
  cards through the normal Operations workflow.

## Administration and rollout

Apply the generated `0040_add_sales_operations_team` migration before running the updated app.
In **Settings > Users**, keep the user as **Executive**, select **Sales & Operations** in the
Team column, and configure eligible services through **Scope**. The dashboard displays both
workspaces and the sidebar exposes both modules. Existing user assignments need no backfill.

This is support for the Sales/Operations combination, rather than arbitrary combinations of
authentication roles. If independent service scopes or many additional team combinations are
needed later, introduce team-membership records instead of adding combinations indefinitely.
