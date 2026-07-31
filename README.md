# FirstMan CRM

A CRM for **FirstMan Corporate Services** (Indian corporate services: company
registration, GST, compliance, trademarks, licenses) — leads, clients, orders,
compliance calendar, invoicing, and WhatsApp/email notifications.

This build follows the phased spec in `CLAUDE.md`. All 9 phases (0–8) are
implemented: auth/roles, service catalog, clients, leads (kanban + public
API), orders with auto-generated task/document checklists, document uploads,
a compliance calendar with nightly rollover/reminders, invoicing + payments +
PDF, WhatsApp/email notifications, and role-aware dashboards/reports/global
search. See "Phase checklists" below for the per-phase detail, and
`CLAUDE.md` §5 for the original spec.

## Architecture

```
Browser
  │
  ▼
Next.js 15 (App Router) ── Server Components / Server Actions ── src/actions, src/app
  │                                                    │
  │                                                    ▼
  │                                          src/services (business logic)
  │                                                    │
  ▼                                                    ▼
better-auth (email/password + admin/roles)     Drizzle ORM ──► PostgreSQL 16
  │                                                    │
  ▼                                                    ▼
middleware.ts (route guards + security headers)  pg-boss (Postgres-backed queue)
                                                        │
                                                        ▼
                                                  src/jobs (workers, cron)
```

- **Framework:** Next.js 15.5, React 19, TypeScript strict (`noUncheckedIndexedAccess` on).
- **Database:** PostgreSQL 16, via Drizzle ORM (`postgres.js` driver). Schema lives in
  `src/db/schema/*`; migrations in `./drizzle`, generated with `drizzle-kit generate`
  and applied with `drizzle-kit migrate` (or `tsx src/db/migrate.ts` at deploy time,
  since `drizzle-kit` itself is a devDependency not shipped in the production image).
- **Auth:** better-auth, email/password, with the `admin` plugin and four custom
  roles (`super_admin`, `manager`, `executive`, `accountant`) defined in
  `src/lib/permissions.ts`. Route protection is layered: `src/middleware.ts` does a
  fast cookie-presence check (edge-safe) and redirects; `src/lib/session.ts`'s
  `requireUser()`/`requireRole()` re-validate the real session server-side in the
  `(crm)` layout and any page that needs it — never trust the middleware check alone.
- **UI:** Tailwind CSS 4 + shadcn/ui (Base UI primitives, not Radix — that's shadcn's
  current default; see Assumptions). Role-aware sidebar nav in
  `src/components/nav-config.ts` + `app-sidebar.tsx`.
- **Jobs:** pg-boss, bootstrapped in `src/lib/queue.ts` and started from
  `src/instrumentation.ts` on server boot. Workers live in `src/jobs/*`: WhatsApp/email
  notification sends (lead assigned, order status change, docs-pending, invoice
  sent/paid), nightly compliance-status rollover + T-15/T-7/T-1 reminders, the
  morning per-executive follow-up digest, and the daily overdue-invoices digest —
  every job is idempotent with retry/backoff and logs to `message_logs` /
  `activity_logs`.
- **Logging:** pino, structured JSON, `src/lib/logger.ts`. No `console.log` in app
  code (Biome's `noConsole` rule enforces this; seed/migration CLI scripts and config
  files are exempted via a `biome.json` override since they're one-off Node scripts,
  not request-serving code).
- **Errors:** Sentry (`@sentry/nextjs`), env-gated — no-ops when `SENTRY_DSN` /
  `NEXT_PUBLIC_SENTRY_DSN` are empty.
- **Health check:** `GET /api/health` checks DB + queue connectivity, returns
  `503` if either is down. Used by Coolify's health check.

## Getting started

Prerequisites: Node 24+, a running PostgreSQL 16 instance.

```bash
cp .env.example .env      # then fill in DATABASE_URL, secrets, etc.
npm install
npm run db:migrate        # applies ./drizzle/*.sql
npm run db:seed           # creates admin@firstman.in + 3 users per staff role
npm run dev
```

Seeded accounts (password is `ADMIN_DEFAULT_PASSWORD` from `.env` for all of them):

| Email | Role |
|---|---|
| `admin@firstman.in` | `super_admin` |
| `manager{1,2,3}@firstman.in` | `manager` |
| `executive{1,2,3}@firstman.in` | `executive` |
| `accountant{1,2,3}@firstman.in` | `accountant` |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — see Assumptions on why not Turbopack) |
| `npm run start` | Serve the build with `next start` (local use; Docker uses the standalone server directly, see Dockerfile) |
| `npm run lint` / `lint:fix` | Biome check / check+fix |
| `npm run format` | Biome format |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run test:e2e` | Playwright, against `next dev` (see Assumptions) |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply migrations (drizzle-kit, dev/CI) |
| `npm run db:migrate:deploy` | Apply migrations at runtime via `tsx` (used by the Docker image) |
| `npm run db:push` | Push schema directly, no migration file (fast local iteration only) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed demo users |

## Environment variables

See `.env.example` for the full list with placeholder values. Notable ones:

- `DATABASE_URL` — Postgres connection string.
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — auth config; secret must be ≥32 chars.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ID` — leave
  blank in dev to use a console/log driver (wired up in Phase 7).
- `LEADS_API_TOKEN` — bearer token for the public `POST /api/v1/leads` endpoint
  (Phase 2).
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — leave blank to disable Sentry.

All env vars are validated at boot with Zod (`src/lib/env.ts`) — the app throws on
startup with a clear error rather than failing confusingly later.

## Deployment

### Local Docker

```bash
docker compose up --build   # local: app + postgres
```

The `Dockerfile` is a multi-stage build producing a Next.js **standalone** output.
The final image runs `tsx src/db/migrate.ts` (forward-only migrations from
`./drizzle`) before starting `node server.js`, so migrations apply automatically on
deploy — see Non-negotiables in `CLAUDE.md`.

### Coolify

1. **New Resource → Application → Public/Private Git Repository**, point it at
   this repo/branch. Coolify auto-detects the `Dockerfile` at the repo root
   (Build Pack: Dockerfile) — no buildpack config needed.
2. **Attach a PostgreSQL 16 database** (Coolify's managed Postgres resource, or
   any external instance) in the same project so it's on the same Docker network
   and reachable by service name.
3. **Environment variables** — set every var from `.env.example` in the app's
   Coolify environment tab. At minimum: `DATABASE_URL` (pointing at the attached
   Postgres service), `BETTER_AUTH_SECRET` (32+ random chars — generate with
   `openssl rand -base64 32`, never reuse the CI/dev value), `BETTER_AUTH_URL`
   (the app's public HTTPS URL Coolify assigns/you configure), `ADMIN_DEFAULT_PASSWORD`,
   SMTP_*, and `WHATSAPP_*` (leave blank to keep the log driver until real
   Meta Cloud API credentials exist). `src/lib/env.ts` validates all of these at
   boot — a misconfigured deploy fails fast with a clear error instead of a
   silent runtime crash.
4. **Health check**: set the container health check path to `/api/health`
   (checks DB + pg-boss queue connectivity, returns `503` if either is down) —
   Coolify uses this to gate traffic cutover during a deploy.
5. **Port**: the standalone server listens on `3000` inside the container
   (see `Dockerfile`/`server.js`); Coolify's proxy handles the public HTTPS port.
6. **Migrations run automatically** on container start (`tsx src/db/migrate.ts`
   before `node server.js`, baked into the image's entrypoint) — no manual
   migration step in the Coolify deploy pipeline. Migrations are forward-only;
   never edit an applied one, always add a new one via `npm run db:generate`.
7. **Demo data (optional)** — the runner image is intentionally slim and does
   *not* include `src/db/seed.ts` (only `migrate.ts` and its own dependencies
   are copied in, per the Dockerfile), so seeding can't be run inside the
   deployed container. If you want the demo dataset on a Coolify-hosted
   database, run `DATABASE_URL=<coolify-postgres-connection-string> npm run
   db:seed` from a machine with the full repo checked out (e.g. your laptop, or
   a CI job) — never for a real production tenant.
8. **CI → Coolify handoff**: `.github/workflows/ci.yml` builds and tags the
   Docker image on version tags (`v*`) after `build-and-test` passes; wiring
   the registry push and Coolify deploy webhook is the last step (needs
   registry credentials + the Coolify webhook URL as repo secrets — not yet
   configured in this environment, see Assumption #8).

## Testing

- **Unit/integration** (Vitest): `src/**/*.test.ts`, 220 tests across 30 files,
  running against a real Postgres instance (not mocked) so scoping, transactions,
  and constraints are exercised for real. Coverage threshold is 80% on
  `src/services` (lines/functions/branches/statements) — current numbers: 97.1%
  lines, 95.2% functions, 93.0% statements, 83.4% branches. Every state
  transition called out in `CLAUDE.md` §2 has a test (lead conversion, order
  status change, invoice payment, compliance rollover), and time-dependent logic
  (compliance rollover, digests, aging-receivables buckets) is tested with
  `vi.setSystemTime`/explicit `now` params rather than real wall-clock time.
- **E2E** (Playwright): `tests/e2e/*.spec.ts` — `login.spec.ts` (unauthenticated
  redirect + successful login) and `critical-path.spec.ts`, the full spec §5
  smoke flow: login → create lead → convert to client → create order → create
  invoice → send invoice → record payment. Runs against `next dev` on a
  dedicated port (see Assumption #6) with `fullyParallel: false` / `workers: 1`
  — a cold Turbopack dev server compiles each route serially on first hit, so
  parallel specs contend for that same compile window and produce spurious
  failures unrelated to the app itself; serial execution plus generous
  timeouts (`playwright.config.ts`) is what makes this suite reliable.

## Assumptions

Per `CLAUDE.md`'s closing instruction, decisions made where the spec didn't
prescribe an exact answer:

1. **shadcn/ui base library**: shadcn's current default preset (`base-nova`) uses
   Base UI (`@base-ui/react`) primitives, not Radix. The spec just says "shadcn/ui"
   without pinning the underlying primitive library, so we kept the CLI default
   rather than fighting it. This means composed components use a `render` prop
   (`<SidebarMenuButton render={<Link href="..." />}>`) instead of Radix's
   `asChild` + `<Slot>` pattern — worth knowing before copying examples from
   shadcn/Radix-era docs.
2. **`next build` without `--turbopack`**: `create-next-app` defaults `build` to
   `next build --turbopack`. On Windows, Turbopack's standalone-output file copy
   fails on chunk filenames containing a literal `:` (from `node:`-prefixed
   externals like `node:inspector`) — `:` isn't valid in a Windows path. Dropped
   `--turbopack` from the `build` script only; `dev` keeps it, since dev doesn't
   hit that copy step. Worth re-testing when Turbopack's Windows support matures.
3. **pg-boss + `pino-pretty` don't survive bundling**: `pino`'s `transport` option
   spawns a worker thread that loads a JS file by path, and that path resolution
   breaks under both Turbopack and webpack bundling (`thread-stream` module not
   found). `src/lib/logger.ts` emits structured JSON unconditionally; pipe
   `npm run dev | npx pino-pretty` locally if you want colorized dev output.
4. **`role` column is `text`, not a Postgres enum**: better-auth's CLI
   (`@better-auth/cli generate`) owns `src/db/schema/auth-schema.ts` — it's
   regenerated, not hand-edited, whenever the auth config changes. Better-auth
   expects `role` as a plain string internally, so we didn't fight it into a
   `pgEnum`. The `Role` union type (`src/lib/auth.ts`) and Zod validation are the
   actual enforcement; the `roleEnum` pgEnum in `src/db/schema/_shared.ts` is there
   for future domain tables (leads, orders, etc. all need a role-ish enum too) and
   is unrelated to `user.role`.
5. **`activity_logs` is append-only**: it deliberately skips the shared
   `updatedAt`/`deletedAt`/`createdBy`/`updatedBy` columns from
   `src/db/schema/_shared.ts` that every other table gets — an audit log that could
   be edited or soft-deleted defeats its own purpose.
6. **E2E tests run against `next dev`, not the Docker standalone build**: Next's
   standalone output only copies `public/` and `.next/static/` into
   `.next/standalone/` as a *manual* deploy step (that's what the Dockerfile does).
   Replicating that step just for local/CI Playwright runs added complexity for
   little benefit, since `npm run build` already runs as its own CI step and
   validates the production build compiles and type-checks. Playwright's
   `webServer` therefore runs `next dev` on a dedicated port (3100), with
   `BETTER_AUTH_URL` overridden to match — better-auth validates the request
   `Origin` header against it.
7. **`npm audit` is informational in CI, not blocking**: as of this writing, a
   from-scratch Next 15 + drizzle-kit + exceljs install carries 17 advisories
   (5 moderate, 12 high), all transitive, all inside dependencies' own bundled
   tooling (Next's vendored `sharp`/`postcss`, drizzle-kit's vendored `esbuild`,
   exceljs's `archiver`→`zip-stream` chain), and every available fix is a breaking
   downgrade of a pinned core dependency (e.g. `next` → `9.3.3`). Making the audit
   step blocking would make CI permanently red from commit zero, defeating its
   purpose of catching *new* regressions. `ci.yml`'s audit step runs with
   `continue-on-error: true` so it's visible without gating merges — revisit this
   whenever `next`, `drizzle-kit`, or `exceljs` ship a fix.
8. **Docker wasn't build-tested in this environment**: no Docker CLI is installed
   on this machine. The `Dockerfile`/`docker-compose.yml` follow the standard
   Next.js standalone multi-stage pattern and the CI workflow builds the image on
   tagged releases, but a first real `docker build` should happen before relying on
   it for a deploy.
9. **Local dev DB**: this machine already has PostgreSQL 16 installed natively
   (not in Docker) with `postgres`/`postgres` credentials — `.env`'s `DATABASE_URL`
   points at that instance directly rather than the `docker-compose.yml` Postgres
   service, which is there for teams without a local install.
10. **Internal staff notifications are email-only, never WhatsApp**: better-auth's
    `user` table (`src/db/schema/auth-schema.ts`, CLI-generated — see #4) has no
    phone column, and better-auth's schema isn't one we hand-edit. So "new lead
    assigned" and the T-15 compliance internal-task reminder, which spec 4.1/4.6
    describe as WhatsApp alerts to staff, go out by email instead
    (`src/jobs/lead-notifications.ts`, `src/jobs/compliance-notifications.ts`).
    Client-facing notifications (order status, compliance reminders, invoices,
    docs-pending) still send WhatsApp + email as specified, since `clients.phone`
    exists. If staff WhatsApp becomes a real requirement, it needs a phone field
    added to a separate staff-profile table (not `user` itself).
11. **CI has failed on every push so far (unit-test step) and hasn't been
    re-verified since**: the workflow has run 3 times on `origin` (through the
    Phase 6 commit), all 3 red at the "Unit tests" step, with everything after
    it (E2E, build, audit) skipped as a result. Log access needs repo-admin
    rights this environment doesn't have, so the exact failure reason on
    GitHub's Ubuntu runners is unconfirmed. What *is* confirmed: on the current
    codebase (through Phase 8), `npm run typecheck`, `npm run lint`, and
    `npm run test:coverage` all pass cleanly against a **freshly created,
    migrated, and seeded** Postgres database (mirroring the CI job's exact
    sequence — migrate → seed → test — rather than reusing a long-lived local
    dev DB), so whatever caused the earlier failures looks to already be fixed
    by later-phase work. Treat CI as **unverified, not green**, until it
    actually runs on GitHub Actions against this code and the run is checked.

## Phase checklists (per `CLAUDE.md` §5)

**Phase 0 — Scaffold**
- [x] Login works (`admin@firstman.in`, seeded), redirects correctly both ways
      (unauthenticated → `/login`, authenticated visiting `/login` → `/dashboard`).
- [x] Roles seeded (super_admin/manager/executive/accountant, 3 staff each).
- [x] Protected routes redirect (middleware cookie check + server-side
      `requireUser()` defense in depth; role-gated nav items verified for
      `executive`).
- [x] `/api/health` reports DB + queue connectivity.
- [x] Pre-commit hook (`lint-staged` + typecheck) and commit-msg hook (commitlint)
      installed via husky.
- [ ] **CI green on the first push** — still unverified; see Assumption #11.

**Phase 1 — Catalog + Clients**
- [x] Full service catalog seeded (registration types, GST, ITR, annual
      compliance, trademarks, FSSAI, MSME/Udyam, IEC, ISO, DIR-3 KYC) and
      visible at `/catalog`.
- [x] Client create/edit works, tabbed profile shell in place.
- [x] Executive scoping (`assignedTo = session.userId`) enforced at the
      service layer and covered by a test (`src/services/clients.test.ts`).

**Phase 2 — Leads**
- [x] Leads CRUD, kanban board (`@dnd-kit`, optimistic status updates), and a
      filterable table view.
- [x] Follow-ups, overdue indicator, manual + round-robin assignment.
- [x] `convertLeadToClient` is one DB transaction (client + optional order +
      lead status → `won`); direct `status: "won"` writes are rejected
      (`updateLeadStatus` throws — see `leads.test.ts`).
- [x] `POST /api/v1/leads` — bearer token auth, rate-limited
      (`src/lib/rate-limit.ts`), enqueues a (log-driver) WhatsApp alert to the
      assigned executive; covered by `src/app/api/v1/leads/route.test.ts`.

**Phase 3 — Orders & Tasks**
- [x] Creating an order auto-generates its `order_tasks` checklist and document
      checklist from the service's `checklistTemplate`/`requiredDocuments` in
      one transaction (`orders.test.ts` asserts this for Pvt Ltd registration).
- [x] Status timeline, inline task status updates, docs-pending badge.
- [x] Status change enqueues a WhatsApp + email update to the client, logged.

**Phase 4 — Documents**
- [x] Upload route handler: 10 MB cap, magic-byte validation (not extension),
      randomized stored filename.
- [x] Status flow (pending → received → verified/rejected) with reject reason.
- [x] Downloads only via short-lived HMAC-signed URLs; a direct `./storage`
      path request is not routable (`documents.test.ts` + route handler).

**Phase 5 — Compliance Calendar**
- [x] `compliance_items` schema + calendar/list views + dashboard "next 14
      days" widget; one-click "Create order from compliance item".
- [x] Nightly pg-boss cron rolls status (`due_soon` at T-15, `overdue` past
      due) and auto-generates the next occurrence on `filed` for recurring
      items — both paths covered by time-frozen tests (`vi.setSystemTime`) in
      `compliance.test.ts`.
- [x] T-15/T-7/T-1 client reminders (WhatsApp + email) and a T-15 internal
      task for the assigned executive (see Assumption #10 on the WhatsApp→email
      substitution for internal-only notifications).

**Phase 6 — Invoicing**
- [x] Invoices with jsonb line items, GST (0/18%), status flow
      (draft→sent→partially_paid/paid→overdue), auto-numbered
      (`FM-INV-{year}-{seq}`).
- [x] Recording a payment updates invoice status automatically (partial vs
      full) — tested with exact-paise assertions, no float math anywhere
      (`invoices.test.ts`, `money.test.ts`).
- [x] PDF via `@react-pdf/renderer` with company branding from settings;
      renders and downloads correctly.
- [x] `expenses` for simple P&L; daily overdue-invoices digest to
      accountant + manager.

**Phase 7 — Communication**
- [x] `src/services/whatsapp.ts` wraps the Meta Cloud API with a console/log
      driver fallback when `WHATSAPP_TOKEN` is empty — every send goes through
      a pg-boss job (retry + backoff), never called inline in a request.
- [x] Every spec 4.8 notification event wired and enqueuing: lead assigned,
      morning per-executive follow-up digest, order status change, weekly
      docs-pending reminder, compliance T-15/7/1, invoice sent/paid, overdue
      invoices digest.
- [x] `message_logs` rows created for every send (channel, to, template,
      status, error) — verified via the log driver in tests and the smoke seed.
- [x] `client.whatsappOptedOut` flag respected (manual toggle; inbound `STOP`
      webhook is a documented v2 item, not built — no webhook infra in v1).

**Phase 8 — Dashboards, Reports & Polish**
- [x] Role-aware dashboard: manager/admin gets the leads funnel, revenue
      this-month-vs-last, orders-by-status, overdue tasks, and top-services
      widgets; executive gets follow-ups-today, my-open-tasks, and
      my-orders-in-progress; accountant's outstanding/collections/expenses
      widgets carry over from Phase 7.
- [x] 5 reports (`src/services/reports.ts`) each with an exceljs export via
      `/api/reports/[report]/export`: lead source performance, conversion rate
      by source and by executive, revenue by service, aging receivables
      (bucketed, nets out partial payments), compliance filing status.
- [x] cmdk global search (⌘K/Ctrl+K) across leads/clients/orders/invoices,
      mirroring each module's own role-scoping exactly (`src/services/search.ts`).
- [x] Full demo seed is fully navigable — verified via `db:migrate && db:seed`
      against a **fresh** database, then a scripted browser smoke test
      (login as each role, dashboard widgets, all 5 report pages + Excel
      export downloads, command palette) with zero console errors.
- [x] Playwright critical-path smoke suite (login → lead → convert → order →
      invoice → send → pay) passes, 2 consecutive clean runs.
- [x] `src/services/analytics.ts`, `reports.ts`, and `search.ts` all have
      dedicated integration test suites; full suite (220 tests) + 80%
      coverage gate pass against a fresh CI-mirrored database.
