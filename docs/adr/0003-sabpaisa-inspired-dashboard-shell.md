# 0003. Light, grouped-nav dashboard shell (SabPaisa-inspired), brand pink retained

## Status

Accepted

## Context

The business shared reference screenshots of the SabPaisa payment-gateway dashboard (a light,
grouped sidebar with section labels; a topbar with a search field, notification bell, and
avatar/role dropdown; a gradient greeting hero; flat stat cards with a top-right colored icon
chip; polished bar/area charts) and asked for FirstMan's shell and dashboard to adopt that look.

FirstMan's existing shell was a deliberate, documented choice: a dark-charcoal, flat-list
sidebar modeled on QuickBooks' nav pattern, paired with a brand-pink accent swapped in from the
original template's blue (`src/app/globals.css`, commit `e46a60d`). Reworking the sidebar theme
reverses part of that earlier decision, so it gets its own ADR rather than being folded silently
into a "polish" commit.

Two scoping calls were made explicitly with the business before implementation:

1. Adopt SabPaisa's **structure** (light sidebar, grouped nav, topbar avatar/bell, hero banner,
   icon-chip cards, chart polish) but **keep FirstMan's brand-pink accent** — the pink swap was a
   deliberate, recent brand decision and this change isn't meant to reopen it.
2. Scope this pass to the **shell (sidebar + topbar) and the dashboard only**. SabPaisa's richer
   list/table pattern (tabs, quick date-range pills, search-by-field, Filters/Export/Columns,
   rows-per-page) is real, separate work and is deliberately deferred — Job Cards, Clients,
   Invoices, Enquiries, Compliance, and Expenses keep their existing filter-form + table +
   prev/next pattern for now.

## Decisions

1. **The sidebar becomes light, not SabPaisa's blue.** `--sidebar`/`--sidebar-foreground` in
   `src/app/globals.css` flip from dark-charcoal/near-white text to a near-white surface with
   dark text (mirroring the app canvas's existing "raised surface" convention). Active/hover nav
   state uses `--brand-muted`/`--primary` (the existing pink tokens) rather than a new blue —
   `--sidebar-accent`/`--sidebar-primary` now alias the app's brand tokens instead of carrying
   independent charcoal-theme values, so there's one source of truth for "brand color" going
   forward. Dark mode's sidebar tokens are unchanged — they were already dark and legible, and
   this change is a light-mode shell decision.

2. **Nav items gained a `group` field and render as labeled sections, not a flat list.**
   `NavItem.group: "Main" | "Operations" | "Finance" | "Admin"` in `src/components/nav-config.ts`
   groups the existing 10 items (Dashboard under Main; Enquiries/Clients/Catalog/Job
   Cards/Compliance under Operations; Invoices/Expenses/Reports under Finance; Settings under
   Admin). `AppSidebar` renders each non-empty group as a `SidebarGroup` +
   `SidebarGroupLabel` — primitives that already existed in `src/components/ui/sidebar.tsx` but
   were unused. Role/team filtering (ADR 0002) runs first, exactly as before; grouping is purely
   presentational on top of the already-filtered item list.

3. **Sign-out moved from the sidebar footer to a new topbar user menu.** SabPaisa (and most
   dashboard shells with an avatar/name/chevron in the topbar) puts account actions there, not in
   the nav. `AppSidebar` lost its `SidebarFooter`; `src/components/topbar-user-menu.tsx` (new,
   client component) now owns the avatar-initials trigger, name/role display, a conditional
   Settings link (same `super_admin`/`manager` gate `nav-config.ts` already uses), and the
   sign-out call that used to live in `AppSidebar`.

4. **The topbar gained a notification bell, backed by data the app already scopes correctly —
   not a new "unread" feature.** `src/components/notifications-bell.tsx` (new) renders a badge
   count + dropdown; `src/app/(crm)/layout.tsx` computes its contents per role, reusing existing
   service functions rather than adding new ones:
   - `accountant` → `getOutstandingInvoicesTotal` (single summary line).
   - sales-team `executive` → `listFollowUpsDueForExecutive` (already userId-scoped).
   - `super_admin`/`manager` → `getOverdueTasks(scope, …)` (the function's own doc comment says
     it's only vetted for manager/admin scope — see the caveat below).
   - any other `executive` → **`getMyOpenTasks(user.id, …)` filtered to overdue client-side**,
     *not* `getOverdueTasks(scope, …)`. `getOverdueTasks` only applies its `assignedTo` filter
     when `scope.employeeType === "internal"`; a franchise executive hitting that path would see
     every overdue task company-wide in their topbar bell — the exact cross-territory leak the
     scope layer exists to prevent. `getMyOpenTasks` is hard-filtered by `assignedTo = userId` at
     the query level regardless of `employeeType`, so it's the safe choice for a shell element
     that renders on every page for every executive, not just the manager/admin-only dashboard
     widget `getOverdueTasks` was originally written for.
   There is no "mark as read" state — no notifications table or read/unread tracking was added,
   since the bell is a live view over existing overdue/due data, not a persisted feed. Building
   that is a separate, real feature if the business wants it later, not implied by this shell
   change.

5. **The dashboard gained a gradient greeting hero with an optional role-specific headline
   stat.** `src/components/dashboard/dashboard-hero.tsx` (new) renders "{Good
   morning/afternoon/evening}, {first name}!" plus the date (via `formatInTimeZone`, matching the
   rest of the dashboard's TZ handling), with a small elevated card overlapping its bottom edge
   showing one number already computed by `dashboard/page.tsx` for that role (revenue this month
   for manager/admin, outstanding invoices for accountant, sales this month for a sales
   executive, open task count for any other executive). No new queries were added — the hero
   only reads values the page's existing role-branched `Promise.all` calls already produce.

6. **`StatCard` restyled to a flat card with a top-right icon square; `SectionCard` left as-is.**
   `StatCard` (`src/components/dashboard/stat-card.tsx`) dropped its `border-l-4` left accent bar
   in favor of a flat `Card` with the label top-left and a `rounded-lg` colored icon chip
   top-right, a larger value, and a new optional `subLabel` for secondary context — matching
   SabPaisa's single-number card. It still reads its colors from
   `STAT_COLOR_CLASSES.chip` (`dashboard-colors.ts`) — no new color-token surface was added, the
   existing `chip` classes just render in a square instead of a circle now. `SectionCard` (which
   holds lists/charts, not a single number) is intentionally unchanged — it has no direct
   SabPaisa analog and wasn't part of the agreed scope.

7. **Charts got a visual polish pass, not a chart-type change.** SabPaisa's gradient area/donut
   charts need daily-granularity time-series data (`getRevenueThisMonthVsLast` returns two
   month totals, not a series) that the analytics layer doesn't compute today — building that is
   new backend work, and out of scope for a shell/visual pass. `RevenueChart` and
   `EnquiriesFunnelChart` (`src/components/dashboard/*.tsx`) instead got an SVG gradient fill on
   their existing bars, a softened grid, and a rounded/bordered tooltip — same bar-chart shape,
   closer to the reference aesthetic.

## Consequences

- `--sidebar-primary`/`--sidebar-accent` now alias `--primary`/`--brand-muted` instead of having
  independent values — a future rebrand only needs to touch the primary/brand tokens, not the
  sidebar tokens separately, but it also means the sidebar's active-state color can no longer
  diverge from the app's main accent without an explicit new token.
- `AppSidebar` no longer renders a footer or owns sign-out; anything that assumed sign-out lived
  in the sidebar (e.g. a future E2E test) needs to target the topbar user menu instead.
- `src/app/(crm)/layout.tsx` now runs one additional role-scoped query per request (for the
  notification bell), on every authenticated page — kept cheap (capped-row queries already used
  elsewhere, no new indexes needed) but it is new per-request DB work that didn't exist before.
- `StatCard` callers that don't pass `subLabel` are unaffected; the visual change (border → flat
  icon-square) applies to every existing call site automatically.

## Alternatives considered

- **Adopting SabPaisa's blue accent as well.** Rejected per the business's explicit answer —
  brand pink was a recent, deliberate decision and this change is about structure, not identity.
- **Rolling the SabPaisa list/table toolbar pattern (tabs, date pills, export, column picker,
  rows-per-page) into this same pass.** Rejected as too large for one change — six list pages
  would need a new shared toolbar component built and proven first. Deferred to a follow-up ADR
  once this shell lands.
- **Building true daily-series area/donut charts for the dashboard.** Rejected for now — would
  require new analytics queries beyond what this visual-shell pass was scoped to touch. A
  reasonable follow-up once a daily-granularity revenue query exists.
- **A real persisted notifications feed (read/unread state, a `notifications` table).** Rejected
  as over-building for what the topbar needed — a live view over already-scoped overdue/due data
  serves the same purpose without inventing new schema and state management the business hasn't
  asked for.
